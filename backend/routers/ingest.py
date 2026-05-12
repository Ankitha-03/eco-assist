from __future__ import annotations
import os
import random
import shutil
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db import get_db
from models.schemas import TelemetryIn, SimulateIn
from services.health_score import compute_health_score
from services.alert_service import create_and_broadcast_alert

router = APIRouter(tags=["ingest"])

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


async def _process_telemetry(db: AsyncSession, data: dict, device_id: str) -> dict:
    result = compute_health_score(data)
    health_score = result["health_score"]
    spoilage_risk = result["spoilage_risk"]

    await db.execute(
        text(
            """
            INSERT INTO telemetry_logs
              (device_id, temperature, humidity, pressure, voc_level, ammonia_level, health_score, spoilage_risk)
            VALUES
              (:device_id, :temperature, :humidity, :pressure, :voc_level, :ammonia_level, :health_score, :spoilage_risk)
            """
        ),
        {
            "device_id": device_id,
            "temperature": data.get("temperature"),
            "humidity": data.get("humidity"),
            "pressure": data.get("pressure"),
            "voc_level": data.get("voc_level"),
            "ammonia_level": data.get("ammonia_level"),
            "health_score": health_score,
            "spoilage_risk": spoilage_risk,
        },
    )
    await db.execute(
        text("UPDATE devices SET last_seen = NOW() WHERE id = :id"),
        {"id": device_id},
    )
    await db.commit()

    if spoilage_risk in ("high", "critical"):
        farmer_result = await db.execute(
            text("SELECT farmer_id FROM devices WHERE id = :id"),
            {"id": device_id},
        )
        row = farmer_result.fetchone()
        if row:
            await create_and_broadcast_alert(db, str(row.farmer_id), device_id, spoilage_risk, health_score)

    return {
        "health_score": health_score,
        "spoilage_risk": spoilage_risk,
        "device_id": device_id,
    }


@router.post("/ingest/telemetry")
async def ingest_telemetry(body: TelemetryIn, db: AsyncSession = Depends(get_db)):
    device_result = await db.execute(
        text("SELECT id FROM devices WHERE id = :id OR mac_address = :mac"),
        {"id": body.device_id if _is_uuid(body.device_id) else "00000000-0000-0000-0000-000000000000",
         "mac": body.mac_address or ""},
    )
    row = device_result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Device not found")

    device_id = str(row.id)
    data = {
        "temperature": body.temperature,
        "humidity": body.humidity,
        "pressure": body.pressure,
        "voc_level": body.voc_level,
        "ammonia_level": body.ammonia_level,
    }
    return await _process_telemetry(db, data, device_id)


@router.post("/ingest/camera")
async def ingest_camera(
    device_id: str = Form(...),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    device_result = await db.execute(
        text("SELECT id FROM devices WHERE id = :id"),
        {"id": device_id},
    )
    if not device_result.fetchone():
        raise HTTPException(status_code=404, detail="Device not found")

    ext = os.path.splitext(image.filename or "upload.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(image.file, f)

    image_url = f"/uploads/{filename}"
    await db.execute(
        text(
            """
            INSERT INTO camera_snapshots (device_id, image_url)
            VALUES (:device_id, :image_url)
            """
        ),
        {"device_id": device_id, "image_url": image_url},
    )
    await db.commit()
    return {"image_url": image_url, "device_id": device_id}


@router.post("/demo/simulate-sensor")
async def simulate_sensor(body: SimulateIn, db: AsyncSession = Depends(get_db)):
    device_result = await db.execute(
        text("SELECT id, farmer_id FROM devices WHERE mac_address = :mac"),
        {"mac": body.device_mac},
    )
    row = device_result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"No device with MAC {body.device_mac}")

    device_id = str(row.id)

    if body.force_critical or random.random() < 0.1:
        temperature = round(random.uniform(20, 30), 1)
        humidity = round(random.uniform(40, 60), 1)
        voc_level = round(random.uniform(400, 700), 1)
        ammonia_level = round(random.uniform(40, 80), 1)
    else:
        temperature = round(random.uniform(2, 14), 1)
        humidity = round(random.uniform(72, 97), 1)
        voc_level = round(random.uniform(10, 180), 1)
        ammonia_level = round(random.uniform(1, 22), 1)

    pressure = round(random.uniform(990, 1020), 1)

    data = {
        "temperature": temperature,
        "humidity": humidity,
        "pressure": pressure,
        "voc_level": voc_level,
        "ammonia_level": ammonia_level,
    }
    result = await _process_telemetry(db, data, device_id)
    result["simulated"] = True
    result["raw"] = data
    return result


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except (ValueError, AttributeError):
        return False
