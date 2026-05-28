from __future__ import annotations
import base64
import json
import logging
import os
import random
import re
import shutil
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db import get_db
from models.schemas import TelemetryIn, SimulateIn
from services.health_score import compute_health_score
from services.alert_service import create_and_broadcast_alert, broadcast_to_farmer

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


def _analyse_image(filepath: str) -> dict:
    """Analyse produce image using Claude vision. Falls back to pixel heuristics if no API key."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if api_key:
        try:
            import anthropic
            ext = os.path.splitext(filepath)[1].lower()
            media_type = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                          ".png": "image/png", ".webp": "image/webp"}.get(ext, "image/jpeg")
            with open(filepath, "rb") as f:
                image_b64 = base64.standard_b64encode(f.read()).decode()

            client = anthropic.Anthropic(api_key=api_key)
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=256,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_b64}},
                        {"type": "text", "text": (
                            "You are a produce quality inspector. Analyse this image and reply ONLY with valid JSON, no other text:\n"
                            '{"mold_detected": bool, "sprout_detected": bool, "visual_health_score": 0-100, "reason": "one sentence"}\n'
                            "Score 100 = perfectly fresh. Score 0 = completely rotten. "
                            "Set mold_detected=true for ANY dark spots, black patches, rot, decay, mold, or spoilage. "
                            "Set sprout_detected=true if you see green shoots or sprouting."
                        )},
                    ],
                }],
            )
            text = msg.content[0].text.strip()
            m = re.search(r'\{.*\}', text, re.DOTALL)
            if m:
                data = json.loads(m.group())
                logger.info(f"Claude vision result: {data}")
                return {
                    "mold_detected": bool(data.get("mold_detected", False)),
                    "sprout_detected": bool(data.get("sprout_detected", False)),
                    "visual_health_score": float(max(0, min(100, data.get("visual_health_score", 80)))),
                }
        except Exception as e:
            logger.warning(f"Claude vision failed, falling back to pixel analysis: {e}")

    # Pixel heuristic fallback (no API key)
    try:
        from PIL import Image
        img = Image.open(filepath).convert("RGB").resize((200, 200))
        pixels = list(img.getdata())
        total = len(pixels)
        damage = sum(
            3 if (r < 80 and g < 65 and b < 65) else
            2 if (r > g * 1.15 and r > b * 1.3 and r + g + b < 370 and r < 175) else
            1 if (r + g + b < 200 and r < 100 and g < 80) else 0
            for r, g, b in pixels
        )
        damage_pct = (damage / (total * 3)) * 100
        health = max(0.0, 100.0 - damage_pct * 5)
        return {"mold_detected": damage_pct > 3, "sprout_detected": health < 40, "visual_health_score": round(health, 2)}
    except Exception:
        return {"mold_detected": False, "sprout_detected": False, "visual_health_score": 80.0}


@router.post("/ingest/camera")
async def ingest_camera(
    device_id: str = Form(...),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    device_result = await db.execute(
        text("SELECT id, farmer_id FROM devices WHERE id = :id"),
        {"id": device_id},
    )
    device_row = device_result.fetchone()
    if not device_row:
        raise HTTPException(status_code=404, detail="Device not found")

    ext = os.path.splitext(image.filename or "upload.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(image.file, f)

    image_url = f"/uploads/{filename}"

    analysis = _analyse_image(filepath)
    mold_detected     = analysis["mold_detected"]
    sprout_detected   = analysis["sprout_detected"]
    visual_health     = analysis["visual_health_score"]

    snap_result = await db.execute(
        text(
            """
            INSERT INTO camera_snapshots
              (device_id, image_url, mold_detected, sprout_detected, visual_health_score)
            VALUES (:device_id, :image_url, :mold_detected, :sprout_detected, :visual_health_score)
            RETURNING id
            """
        ),
        {
            "device_id": device_id,
            "image_url": image_url,
            "mold_detected": mold_detected,
            "sprout_detected": sprout_detected,
            "visual_health_score": visual_health,
        },
    )
    snapshot_id = snap_result.fetchone().id
    await db.commit()

    if mold_detected:
        farmer_id = str(device_row.farmer_id)
        alert_result = await db.execute(
            text(
                """
                INSERT INTO alerts (farmer_id, device_id, alert_type, severity, message)
                VALUES (:farmer_id, :device_id, 'camera_detection', 'critical',
                        'Mold detected in camera image. Check your produce immediately.')
                RETURNING id, farmer_id, device_id, alert_type, severity, message, is_read, created_at
                """
            ),
            {"farmer_id": farmer_id, "device_id": device_id},
        )
        await db.commit()
        alert_row = alert_result.fetchone()
        await broadcast_to_farmer(farmer_id, {
            "type": "alert",
            "id": str(alert_row.id),
            "farmer_id": farmer_id,
            "device_id": device_id,
            "alert_type": alert_row.alert_type,
            "severity": alert_row.severity,
            "message": alert_row.message,
            "is_read": alert_row.is_read,
            "created_at": alert_row.created_at.isoformat() if alert_row.created_at else None,
        })

    return {
        "image_url": image_url,
        "mold_detected": mold_detected,
        "sprout_detected": sprout_detected,
        "visual_health_score": visual_health,
        "snapshot_id": snapshot_id,
        "device_id": device_id,
    }


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
