from __future__ import annotations
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from db import get_db
from models.schemas import UserCreate, UserLogin, UserOut, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


def _hash_password(plain: str) -> str:
    return _pwd_ctx.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return _pwd_ctx.verify(plain, hashed)


def _create_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = _decode_token(credentials.credentials)
    user_id = payload.get("sub")
    result = await db.execute(
        text("SELECT id, email, role, full_name, phone, location, created_at FROM users WHERE id = :id"),
        {"id": user_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return {
        "id": str(row.id),
        "email": row.email,
        "role": row.role,
        "full_name": row.full_name,
        "phone": row.phone,
        "location": row.location,
        "created_at": row.created_at,
    }


def require_role(required_role: str):
    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This endpoint requires role '{required_role}'",
            )
        return current_user
    return _check


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": body.email})
    if existing.fetchone():
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed = _hash_password(body.password)
    result = await db.execute(
        text(
            """
            INSERT INTO users (email, password_hash, role, full_name, phone, location)
            VALUES (:email, :password_hash, :role, :full_name, :phone, :location)
            RETURNING id, email, role, full_name, phone, location, created_at
            """
        ),
        {
            "email": body.email,
            "password_hash": hashed,
            "role": body.role,
            "full_name": body.full_name,
            "phone": body.phone,
            "location": body.location,
        },
    )
    await db.commit()
    row = result.fetchone()
    token = _create_token(str(row.id), row.role)
    user_out = UserOut(
        id=row.id,
        email=row.email,
        role=row.role,
        full_name=row.full_name,
        phone=row.phone,
        location=row.location,
        created_at=row.created_at,
    )
    return TokenOut(access_token=token, user=user_out)


@router.post("/login", response_model=TokenOut)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT id, email, password_hash, role, full_name, phone, location, created_at FROM users WHERE email = :email"),
        {"email": body.email},
    )
    row = result.fetchone()
    if not row or not _verify_password(body.password, row.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _create_token(str(row.id), row.role)
    user_out = UserOut(
        id=row.id,
        email=row.email,
        role=row.role,
        full_name=row.full_name,
        phone=row.phone,
        location=row.location,
        created_at=row.created_at,
    )
    return TokenOut(access_token=token, user=user_out)


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return UserOut(**current_user)
