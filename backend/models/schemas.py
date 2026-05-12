from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str
    full_name: str
    phone: Optional[str] = None
    location: Optional[str] = None

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in ("farmer", "buyer"):
            raise ValueError("role must be 'farmer' or 'buyer'")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: str
    role: str
    full_name: str
    phone: Optional[str]
    location: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Telemetry ───────────────────────────────────────────────────────────────

class TelemetryIn(BaseModel):
    device_id: str
    mac_address: Optional[str] = None
    temperature: float
    humidity: float
    pressure: Optional[float] = None
    voc_level: float
    ammonia_level: float


class TelemetryOut(BaseModel):
    id: int
    device_id: UUID
    temperature: Optional[float]
    humidity: Optional[float]
    pressure: Optional[float]
    voc_level: Optional[float]
    ammonia_level: Optional[float]
    health_score: Optional[float]
    spoilage_risk: Optional[str]
    recorded_at: datetime

    model_config = {"from_attributes": True}


# ── Snapshots ───────────────────────────────────────────────────────────────

class SnapshotOut(BaseModel):
    id: int
    device_id: UUID
    image_url: str
    yolo_detections: Optional[Any]
    visual_health_score: Optional[float]
    mold_detected: bool
    sprout_detected: bool
    captured_at: datetime

    model_config = {"from_attributes": True}


# ── Listings ────────────────────────────────────────────────────────────────

class ListingCreate(BaseModel):
    device_id: Optional[str] = None
    produce_name: str
    quantity_kg: float
    asking_price_per_kg: float
    description: Optional[str] = None
    expires_at: Optional[datetime] = None


class ListingOut(BaseModel):
    id: UUID
    farmer_id: UUID
    device_id: Optional[UUID]
    produce_name: str
    quantity_kg: float
    asking_price_per_kg: float
    description: Optional[str]
    health_score: Optional[float]
    is_verified: bool
    status: str
    expires_at: Optional[datetime]
    created_at: datetime
    farmer_name: Optional[str] = None
    farmer_location: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Bids ────────────────────────────────────────────────────────────────────

class BidCreate(BaseModel):
    listing_id: str
    offered_price_per_kg: float
    message: Optional[str] = None


class BidOut(BaseModel):
    id: UUID
    listing_id: UUID
    buyer_id: UUID
    offered_price_per_kg: float
    message: Optional[str]
    status: str
    counter_price: Optional[float]
    created_at: datetime
    produce_name: Optional[str] = None

    model_config = {"from_attributes": True}


class BidRespond(BaseModel):
    action: str  # "accept" | "reject" | "counter"
    counter_price: Optional[float] = None

    @field_validator("action")
    @classmethod
    def action_must_be_valid(cls, v: str) -> str:
        if v not in ("accept", "reject", "counter"):
            raise ValueError("action must be 'accept', 'reject', or 'counter'")
        return v


# ── Alerts ──────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: UUID
    farmer_id: UUID
    device_id: Optional[UUID]
    alert_type: str
    severity: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Devices ─────────────────────────────────────────────────────────────────

class DeviceOut(BaseModel):
    id: UUID
    farmer_id: UUID
    device_name: str
    mac_address: str
    location: Optional[str]
    is_active: bool
    last_seen: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dashboard ───────────────────────────────────────────────────────────────

class DashboardDeviceData(BaseModel):
    device: DeviceOut
    latest_telemetry: Optional[TelemetryOut]
    latest_snapshot: Optional[SnapshotOut]


class DashboardOut(BaseModel):
    devices: List[DashboardDeviceData]
    unread_alert_count: int


# ── Simulate ────────────────────────────────────────────────────────────────

class SimulateIn(BaseModel):
    device_mac: str
    force_critical: bool = False
