"""
Seed the database with demo data for Eco-Assist.
Run: python seed_demo.py
"""
from __future__ import annotations
import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone

import asyncpg
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()

_db_params = {
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME", "eco_assist"),
}

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_pw(plain: str) -> str:
    return pwd_ctx.hash(plain)


async def seed():
    conn = await asyncpg.connect(**_db_params)

    print("Clearing existing demo data...")
    await conn.execute("TRUNCATE transactions, bids, listings, alerts, camera_snapshots, telemetry_logs, devices, users CASCADE")

    print("Creating users...")
    farmers = [
        (str(uuid.uuid4()), "farmer1@demo.com", hash_pw("demo123"), "farmer", "Ravi Kumar", "+91-9876543210", "Punjab, India"),
        (str(uuid.uuid4()), "farmer2@demo.com", hash_pw("demo123"), "farmer", "Sunita Devi", "+91-9123456789", "Haryana, India"),
    ]
    buyers = [
        (str(uuid.uuid4()), "buyer1@demo.com", hash_pw("demo123"), "buyer", "Akash Traders", "+91-9000000001", "Delhi, India"),
        (str(uuid.uuid4()), "buyer2@demo.com", hash_pw("demo123"), "buyer", "Fresh Mart Co", "+91-9000000002", "Mumbai, India"),
    ]
    all_users = farmers + buyers
    await conn.executemany(
        """
        INSERT INTO users (id, email, password_hash, role, full_name, phone, location)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
        all_users,
    )

    print("Creating devices...")
    devices = [
        (str(uuid.uuid4()), farmers[0][0], "Ravi Field A - Potato Storage", "AA:BB:CC:DD:EE:01", "Punjab Field A"),
        (str(uuid.uuid4()), farmers[0][0], "Ravi Field B - Tomato Cold Room", "AA:BB:CC:DD:EE:02", "Punjab Field B"),
        (str(uuid.uuid4()), farmers[1][0], "Sunita Warehouse - Mixed Produce", "AA:BB:CC:DD:EE:03", "Haryana Warehouse"),
    ]
    await conn.executemany(
        """
        INSERT INTO devices (id, farmer_id, device_name, mac_address, location)
        VALUES ($1, $2, $3, $4, $5)
        """,
        devices,
    )
    device_ids = [d[0] for d in devices]

    print("Inserting 100 telemetry readings per device...")
    now = datetime.now(timezone.utc)
    telemetry_rows = []
    for device_id in device_ids:
        for i in range(100):
            recorded_at = now - timedelta(minutes=i * 30)
            is_bad = (i % 20 == 0)

            if is_bad:
                temp = round(random.uniform(18, 28), 1)
                hum = round(random.uniform(45, 65), 1)
                voc = round(random.uniform(350, 650), 1)
                amm = round(random.uniform(30, 70), 1)
            else:
                temp = round(random.uniform(2, 13), 1)
                hum = round(random.uniform(74, 96), 1)
                voc = round(random.uniform(10, 150), 1)
                amm = round(random.uniform(1, 20), 1)

            pressure = round(random.uniform(998, 1015), 1)
            from services.health_score import compute_health_score
            result = compute_health_score({"temperature": temp, "humidity": hum, "voc_level": voc, "ammonia_level": amm})
            telemetry_rows.append((
                device_id, temp, hum, pressure, voc, amm,
                result["health_score"], result["spoilage_risk"], recorded_at,
            ))

    await conn.executemany(
        """
        INSERT INTO telemetry_logs
          (device_id, temperature, humidity, pressure, voc_level, ammonia_level, health_score, spoilage_risk, recorded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """,
        telemetry_rows,
    )

    print("Creating listings...")
    listing_data = [
        ("Tomatoes", 500, 45.0, "Fresh cherry tomatoes from organic farm. Harvested 2 days ago.", devices[0][0], farmers[0][0], True),
        ("Potatoes", 1200, 18.0, "Premium Kufri Jyoti potatoes. Stored at optimal temperature.", devices[1][0], farmers[0][0], True),
        ("Onions", 800, 22.0, "Nashik variety red onions. Dry skin, minimal sprouting.", devices[2][0], farmers[1][0], True),
        ("Spinach", 150, 55.0, "Fresh palak bunches. Harvested this morning.", devices[2][0], farmers[1][0], False),
        ("Chillies", 200, 80.0, "Bhavnagari chillies, extra spicy. Grade A.", devices[0][0], farmers[0][0], False),
    ]
    listing_ids = []
    for produce, qty, price, desc, dev_id, farmer_id, verified in listing_data:
        tel = await conn.fetchrow(
            "SELECT health_score FROM telemetry_logs WHERE device_id = $1 ORDER BY recorded_at DESC LIMIT 1",
            dev_id,
        )
        health = tel["health_score"] if tel else 80.0
        lid = str(uuid.uuid4())
        listing_ids.append(lid)
        await conn.execute(
            """
            INSERT INTO listings
              (id, farmer_id, device_id, produce_name, quantity_kg, asking_price_per_kg,
               description, health_score, is_verified, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """,
            lid, farmer_id, dev_id, produce, float(qty), float(price),
            desc, health, verified,
            now + timedelta(days=7),
        )

    print("Creating bids...")
    bid_data = [
        (listing_ids[0], buyers[0][0], 40.0, "Looking for 200kg. Can pick up within 2 days."),
        (listing_ids[1], buyers[1][0], 15.0, "Regular buyer. Need 500kg monthly supply."),
        (listing_ids[2], buyers[0][0], 19.0, "Interested in full lot. Please confirm availability."),
    ]
    for lid, buyer_id, price, msg in bid_data:
        await conn.execute(
            """
            INSERT INTO bids (listing_id, buyer_id, offered_price_per_kg, message)
            VALUES ($1, $2, $3, $4)
            """,
            lid, buyer_id, price, msg,
        )

    print("Creating sample alerts...")
    alert_data = [
        (farmers[0][0], device_ids[0], "spoilage_risk", "critical",
         "CRITICAL: Health score dropped to 18. Immediate action required!"),
        (farmers[1][0], device_ids[2], "spoilage_risk", "warning",
         "WARNING: Health score is 42. High spoilage risk — check storage."),
    ]
    await conn.executemany(
        """
        INSERT INTO alerts (farmer_id, device_id, alert_type, severity, message)
        VALUES ($1, $2, $3, $4, $5)
        """,
        alert_data,
    )

    await conn.close()
    print("\n✅ Demo data seeded successfully!")
    print("\nDemo accounts:")
    print("  Farmers  → farmer1@demo.com / farmer2@demo.com  (password: demo123)")
    print("  Buyers   → buyer1@demo.com  / buyer2@demo.com   (password: demo123)")
    print(f"\nDevices:")
    for d in devices:
        print(f"  MAC: {d[4]}  → {d[2]}")


if __name__ == "__main__":
    asyncio.run(seed())
