from __future__ import annotations
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db import get_db
from routers.auth import get_current_user, require_role
from models.schemas import ListingOut, BidCreate, BidOut

router = APIRouter(prefix="/market", tags=["marketplace"])
_buyer = require_role("buyer")


@router.get("/listings", response_model=List[ListingOut])
async def get_listings(
    search: Optional[str] = Query(None),
    verified_only: bool = Query(False),
    healthy_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    conditions = ["l.status = 'active'"]
    params: dict = {}

    if search:
        conditions.append("l.produce_name ILIKE :search")
        params["search"] = f"%{search}%"
    if verified_only:
        conditions.append("l.is_verified = TRUE")
    if healthy_only:
        conditions.append("l.health_score >= 75")

    where_clause = " AND ".join(conditions)
    result = await db.execute(
        text(
            f"""
            SELECT l.*, u.full_name AS farmer_name, u.location AS farmer_location
            FROM listings l
            JOIN users u ON u.id = l.farmer_id
            WHERE {where_clause}
            ORDER BY l.created_at DESC
            LIMIT 100
            """
        ),
        params,
    )
    return [ListingOut.model_validate(row._mapping) for row in result.fetchall()]


@router.get("/listings/{listing_id}")
async def get_listing_detail(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
):
    listing_result = await db.execute(
        text(
            """
            SELECT l.*, u.full_name AS farmer_name, u.location AS farmer_location
            FROM listings l
            JOIN users u ON u.id = l.farmer_id
            WHERE l.id = :id
            """
        ),
        {"id": listing_id},
    )
    row = listing_result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = ListingOut.model_validate(row._mapping)

    sensor_history = []
    if row.device_id:
        history_result = await db.execute(
            text(
                """
                SELECT health_score, spoilage_risk, temperature, humidity, voc_level,
                       ammonia_level, recorded_at
                FROM telemetry_logs
                WHERE device_id = :did
                ORDER BY recorded_at DESC
                LIMIT 24
                """
            ),
            {"did": str(row.device_id)},
        )
        sensor_history = [dict(r._mapping) for r in history_result.fetchall()]

    return {"listing": listing, "sensor_history": sensor_history}


@router.post("/bid", response_model=BidOut, status_code=201)
async def place_bid(
    body: BidCreate,
    current_user: dict = Depends(_buyer),
    db: AsyncSession = Depends(get_db),
):
    listing_result = await db.execute(
        text("SELECT id, status, produce_name FROM listings WHERE id = :id"),
        {"id": body.listing_id},
    )
    listing = listing_result.fetchone()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status not in ("active", "negotiating"):
        raise HTTPException(status_code=400, detail="Listing is not available for bidding")

    existing_bid = await db.execute(
        text(
            "SELECT id FROM bids WHERE listing_id = :lid AND buyer_id = :bid AND status = 'pending'"
        ),
        {"lid": body.listing_id, "bid": current_user["id"]},
    )
    if existing_bid.fetchone():
        raise HTTPException(status_code=400, detail="You already have a pending bid on this listing")

    result = await db.execute(
        text(
            """
            INSERT INTO bids (listing_id, buyer_id, offered_price_per_kg, message)
            VALUES (:listing_id, :buyer_id, :price, :message)
            RETURNING *
            """
        ),
        {
            "listing_id": body.listing_id,
            "buyer_id": current_user["id"],
            "price": body.offered_price_per_kg,
            "message": body.message,
        },
    )
    await db.execute(
        text("UPDATE listings SET status = 'negotiating' WHERE id = :id AND status = 'active'"),
        {"id": body.listing_id},
    )
    await db.commit()
    row = result.fetchone()
    bid = BidOut.model_validate(row._mapping)
    bid.produce_name = listing.produce_name
    return bid


@router.get("/my-bids", response_model=List[BidOut])
async def my_bids(
    current_user: dict = Depends(_buyer),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        text(
            """
            SELECT b.*, l.produce_name
            FROM bids b
            JOIN listings l ON l.id = b.listing_id
            WHERE b.buyer_id = :uid
            ORDER BY b.created_at DESC
            """
        ),
        {"uid": current_user["id"]},
    )
    return [BidOut.model_validate(row._mapping) for row in result.fetchall()]
