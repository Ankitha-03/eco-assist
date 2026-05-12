from __future__ import annotations
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db import get_db
from routers.auth import require_role
from models.schemas import (
    DeviceOut, TelemetryOut, SnapshotOut, AlertOut,
    ListingCreate, ListingOut, BidOut, BidRespond,
    DashboardOut, DashboardDeviceData,
)

router = APIRouter(prefix="/farmer", tags=["farmer"])
_farmer = require_role("farmer")


@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    farmer_id = current_user["id"]

    devices_result = await db.execute(
        text("SELECT * FROM devices WHERE farmer_id = :fid ORDER BY created_at DESC"),
        {"fid": farmer_id},
    )
    devices = devices_result.fetchall()

    device_data = []
    for dev in devices:
        tel_result = await db.execute(
            text(
                "SELECT * FROM telemetry_logs WHERE device_id = :did ORDER BY recorded_at DESC LIMIT 1"
            ),
            {"did": str(dev.id)},
        )
        latest_tel = tel_result.fetchone()

        snap_result = await db.execute(
            text(
                "SELECT * FROM camera_snapshots WHERE device_id = :did ORDER BY captured_at DESC LIMIT 1"
            ),
            {"did": str(dev.id)},
        )
        latest_snap = snap_result.fetchone()

        device_data.append(
            DashboardDeviceData(
                device=DeviceOut.model_validate(dev._mapping),
                latest_telemetry=TelemetryOut.model_validate(latest_tel._mapping) if latest_tel else None,
                latest_snapshot=SnapshotOut.model_validate(latest_snap._mapping) if latest_snap else None,
            )
        )

    alert_count_result = await db.execute(
        text("SELECT COUNT(*) FROM alerts WHERE farmer_id = :fid AND is_read = FALSE"),
        {"fid": farmer_id},
    )
    unread_count = alert_count_result.scalar() or 0

    return DashboardOut(devices=device_data, unread_alert_count=unread_count)


@router.get("/devices", response_model=List[DeviceOut])
async def list_devices(
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text("SELECT * FROM devices WHERE farmer_id = :fid ORDER BY created_at DESC"),
        {"fid": current_user["id"]},
    )
    return [DeviceOut.model_validate(row._mapping) for row in result.fetchall()]


@router.get("/telemetry/{device_id}", response_model=List[TelemetryOut])
async def get_telemetry(
    device_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    ownership = await db.execute(
        text("SELECT id FROM devices WHERE id = :did AND farmer_id = :fid"),
        {"did": device_id, "fid": current_user["id"]},
    )
    if not ownership.fetchone():
        raise HTTPException(status_code=404, detail="Device not found")

    result = await db.execute(
        text(
            "SELECT * FROM telemetry_logs WHERE device_id = :did ORDER BY recorded_at DESC LIMIT :lim"
        ),
        {"did": device_id, "lim": limit},
    )
    return [TelemetryOut.model_validate(row._mapping) for row in result.fetchall()]


@router.get("/snapshots/{device_id}", response_model=List[SnapshotOut])
async def get_snapshots(
    device_id: str,
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    ownership = await db.execute(
        text("SELECT id FROM devices WHERE id = :did AND farmer_id = :fid"),
        {"did": device_id, "fid": current_user["id"]},
    )
    if not ownership.fetchone():
        raise HTTPException(status_code=404, detail="Device not found")

    result = await db.execute(
        text(
            "SELECT * FROM camera_snapshots WHERE device_id = :did ORDER BY captured_at DESC LIMIT :lim"
        ),
        {"did": device_id, "lim": limit},
    )
    return [SnapshotOut.model_validate(row._mapping) for row in result.fetchall()]


@router.get("/alerts", response_model=List[AlertOut])
async def get_alerts(
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text(
            "SELECT * FROM alerts WHERE farmer_id = :fid ORDER BY created_at DESC LIMIT 50"
        ),
        {"fid": current_user["id"]},
    )
    return [AlertOut.model_validate(row._mapping) for row in result.fetchall()]


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text(
            "UPDATE alerts SET is_read = TRUE WHERE id = :id AND farmer_id = :fid RETURNING id"
        ),
        {"id": alert_id, "fid": current_user["id"]},
    )
    await db.commit()
    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True}


@router.post("/listings", response_model=ListingOut, status_code=201)
async def create_listing(
    body: ListingCreate,
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    farmer_id = current_user["id"]
    health_score = None

    if body.device_id:
        tel_result = await db.execute(
            text(
                "SELECT health_score FROM telemetry_logs WHERE device_id = :did ORDER BY recorded_at DESC LIMIT 1"
            ),
            {"did": body.device_id},
        )
        row = tel_result.fetchone()
        if row:
            health_score = row.health_score

    result = await db.execute(
        text(
            """
            INSERT INTO listings
              (farmer_id, device_id, produce_name, quantity_kg, asking_price_per_kg,
               description, health_score, expires_at)
            VALUES
              (:farmer_id, :device_id, :produce_name, :quantity_kg, :asking_price_per_kg,
               :description, :health_score, :expires_at)
            RETURNING *
            """
        ),
        {
            "farmer_id": farmer_id,
            "device_id": body.device_id,
            "produce_name": body.produce_name,
            "quantity_kg": body.quantity_kg,
            "asking_price_per_kg": body.asking_price_per_kg,
            "description": body.description,
            "health_score": health_score,
            "expires_at": body.expires_at,
        },
    )
    await db.commit()
    row = result.fetchone()
    listing = ListingOut.model_validate(row._mapping)
    listing.farmer_name = current_user["full_name"]
    listing.farmer_location = current_user["location"]
    return listing


@router.get("/listings", response_model=List[ListingOut])
async def my_listings(
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text(
            """
            SELECT l.*, u.full_name AS farmer_name, u.location AS farmer_location
            FROM listings l
            JOIN users u ON u.id = l.farmer_id
            WHERE l.farmer_id = :fid
            ORDER BY l.created_at DESC
            """
        ),
        {"fid": current_user["id"]},
    )
    return [ListingOut.model_validate(row._mapping) for row in result.fetchall()]


@router.get("/bids/{listing_id}", response_model=List[BidOut])
async def get_bids_for_listing(
    listing_id: str,
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    ownership = await db.execute(
        text("SELECT id FROM listings WHERE id = :lid AND farmer_id = :fid"),
        {"lid": listing_id, "fid": current_user["id"]},
    )
    if not ownership.fetchone():
        raise HTTPException(status_code=404, detail="Listing not found")

    result = await db.execute(
        text(
            """
            SELECT b.*, l.produce_name
            FROM bids b
            JOIN listings l ON l.id = b.listing_id
            WHERE b.listing_id = :lid
            ORDER BY b.created_at DESC
            """
        ),
        {"lid": listing_id},
    )
    return [BidOut.model_validate(row._mapping) for row in result.fetchall()]


@router.post("/bids/{bid_id}/respond")
async def respond_to_bid(
    bid_id: str,
    body: BidRespond,
    current_user: dict = Depends(_farmer),
    db: AsyncSession = Depends(get_db),
):
    bid_result = await db.execute(
        text(
            """
            SELECT b.*, l.farmer_id
            FROM bids b
            JOIN listings l ON l.id = b.listing_id
            WHERE b.id = :bid_id
            """
        ),
        {"bid_id": bid_id},
    )
    bid = bid_result.fetchone()
    if not bid or str(bid.farmer_id) != current_user["id"]:
        raise HTTPException(status_code=404, detail="Bid not found")

    status_map = {"accept": "accepted", "reject": "rejected", "counter": "countered"}
    new_status = status_map[body.action]

    await db.execute(
        text(
            "UPDATE bids SET status = :status, counter_price = :counter WHERE id = :id"
        ),
        {"status": new_status, "counter": body.counter_price, "id": bid_id},
    )

    if body.action == "accept":
        listing_result = await db.execute(
            text("SELECT * FROM listings WHERE id = :lid"),
            {"lid": str(bid.listing_id)},
        )
        listing = listing_result.fetchone()
        if listing:
            final_price = bid.offered_price_per_kg
            total = final_price * listing.quantity_kg
            await db.execute(
                text(
                    """
                    INSERT INTO transactions
                      (listing_id, bid_id, farmer_id, buyer_id, final_price_per_kg, quantity_kg, total_amount)
                    VALUES
                      (:listing_id, :bid_id, :farmer_id, :buyer_id, :final_price, :qty, :total)
                    """
                ),
                {
                    "listing_id": str(bid.listing_id),
                    "bid_id": bid_id,
                    "farmer_id": current_user["id"],
                    "buyer_id": str(bid.buyer_id),
                    "final_price": final_price,
                    "qty": listing.quantity_kg,
                    "total": total,
                },
            )
            await db.execute(
                text("UPDATE listings SET status = 'sold' WHERE id = :id"),
                {"id": str(bid.listing_id)},
            )

    await db.commit()
    return {"success": True, "new_status": new_status}
