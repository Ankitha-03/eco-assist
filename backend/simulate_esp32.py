"""
Simulates ESP32 sensor data for live demo without real hardware.
Run: python simulate_esp32.py
"""
from __future__ import annotations
import asyncio
import random
import httpx
from dotenv import load_dotenv
import os

load_dotenv()

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

DEVICE_MACS = [
    "AA:BB:CC:DD:EE:01",
    "AA:BB:CC:DD:EE:02",
    "AA:BB:CC:DD:EE:03",
]

COUNTER = 0


async def simulate_once(client: httpx.AsyncClient, mac: str, force_critical: bool = False):
    global COUNTER
    COUNTER += 1

    payload = {"device_mac": mac, "force_critical": force_critical}
    try:
        resp = await client.post(f"{BASE_URL}/demo/simulate-sensor", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            raw = data.get("raw", {})
            risk_color = {
                "low": "\033[92m",
                "medium": "\033[93m",
                "high": "\033[91m",
                "critical": "\033[31m\033[1m",
            }.get(data.get("spoilage_risk", ""), "")
            reset = "\033[0m"
            print(
                f"[{COUNTER:04d}] MAC={mac[-5:]} | "
                f"temp={raw.get('temperature', '?'):5.1f}°C  "
                f"hum={raw.get('humidity', '?'):5.1f}%  "
                f"voc={raw.get('voc_level', '?'):6.1f}ppm  "
                f"amm={raw.get('ammonia_level', '?'):5.1f}ppm  "
                f"→ {risk_color}health={data.get('health_score', '?'):5.1f}  "
                f"risk={data.get('spoilage_risk', '?')}{reset}"
            )
        elif resp.status_code == 404:
            print(f"  [SKIP] Device {mac} not found in DB — run seed_demo.py first")
        else:
            print(f"  [ERR]  {resp.status_code}: {resp.text[:80]}")
    except httpx.ConnectError:
        print(f"  [ERR]  Cannot connect to {BASE_URL} — is the backend running?")
    except Exception as e:
        print(f"  [ERR]  {e}")


async def main():
    print(f"Eco-Assist ESP32 Simulator → {BASE_URL}")
    print("Press Ctrl+C to stop\n")

    async with httpx.AsyncClient() as client:
        tick = 0
        while True:
            tick += 1
            tasks = []
            for mac in DEVICE_MACS:
                force_critical = (tick % 10 == 0) and (mac == DEVICE_MACS[0])
                tasks.append(simulate_once(client, mac, force_critical))
            await asyncio.gather(*tasks)
            await asyncio.sleep(5)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nSimulator stopped.")
