from __future__ import annotations
import json
from datetime import datetime, timezone
from typing import Dict, Set
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import WebSocket

# In-memory registry: farmer_id (str) → set of connected WebSocket clients
_farmer_connections: Dict[str, Set[WebSocket]] = {}


def register_ws(farmer_id: str, ws: WebSocket) -> None:
    _farmer_connections.setdefault(farmer_id, set()).add(ws)


def unregister_ws(farmer_id: str, ws: WebSocket) -> None:
    conns = _farmer_connections.get(farmer_id, set())
    conns.discard(ws)


async def broadcast_to_farmer(farmer_id: str, payload: dict) -> None:
    conns = list(_farmer_connections.get(farmer_id, set()))
    dead: list[WebSocket] = []
    for ws in conns:
        try:
            await ws.send_text(json.dumps(payload, default=str))
        except Exception:
            dead.append(ws)
    for ws in dead:
        unregister_ws(farmer_id, ws)


async def create_and_broadcast_alert(
    db: AsyncSession,
    farmer_id: str,
    device_id: str,
    risk: str,
    score: float,
) -> None:
    severity = "critical" if risk == "critical" else "warning"
    alert_type = "spoilage_risk"

    messages = {
        "critical": f"CRITICAL: Health score dropped to {score:.0f}. Immediate action required to prevent total spoilage!",
        "high": f"WARNING: Health score is {score:.0f}. High spoilage risk detected — check your storage conditions.",
    }
    message = messages.get(risk, f"Alert: spoilage risk is {risk}, score={score:.0f}")

    result = await db.execute(
        text(
            """
            INSERT INTO alerts (farmer_id, device_id, alert_type, severity, message)
            VALUES (:farmer_id, :device_id, :alert_type, :severity, :message)
            RETURNING id, farmer_id, device_id, alert_type, severity, message, is_read, created_at
            """
        ),
        {
            "farmer_id": farmer_id,
            "device_id": device_id,
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
        },
    )
    await db.commit()
    row = result.fetchone()

    payload = {
        "type": "alert",
        "id": str(row.id),
        "farmer_id": str(row.farmer_id),
        "device_id": str(row.device_id) if row.device_id else None,
        "alert_type": row.alert_type,
        "severity": row.severity,
        "message": row.message,
        "is_read": row.is_read,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
    await broadcast_to_farmer(farmer_id, payload)
