from __future__ import annotations
import json
import os
import asyncio
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from routers import auth, ingest, farmer, marketplace
from services.alert_service import register_ws, unregister_ws, broadcast_to_farmer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Eco-Assist API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request, rest_of_path: str):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

app.include_router(auth.router)
app.include_router(ingest.router)
app.include_router(farmer.router)
app.include_router(marketplace.router)

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.websocket("/ws/{farmer_id}")
async def websocket_endpoint(websocket: WebSocket, farmer_id: str):
    await websocket.accept()
    register_ws(farmer_id, websocket)
    logger.info(f"WebSocket connected: farmer {farmer_id}")
    try:
        await websocket.send_text(json.dumps({"type": "connected", "farmer_id": farmer_id}))
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: farmer {farmer_id}")
    finally:
        unregister_ws(farmer_id, websocket)


def _start_mqtt():
    mqtt_host = os.getenv("MQTT_BROKER_HOST", "")
    if not mqtt_host:
        logger.info("MQTT_BROKER_HOST not set — skipping MQTT connection")
        return

    try:
        import paho.mqtt.client as mqtt

        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                logger.info(f"Connected to MQTT broker at {mqtt_host}")
                client.subscribe("eco/sensor/#")
                client.subscribe("eco/camera/#")
            else:
                logger.warning(f"MQTT connection failed with code {rc}")

        def on_message(client, userdata, msg):
            try:
                payload = json.loads(msg.payload.decode())
                logger.info(f"MQTT message on {msg.topic}: {payload}")
            except Exception as e:
                logger.error(f"MQTT message parse error: {e}")

        client = mqtt.Client()
        mqtt_user = os.getenv("MQTT_USERNAME", "")
        mqtt_pass = os.getenv("MQTT_PASSWORD", "")
        if mqtt_user:
            client.username_pw_set(mqtt_user, mqtt_pass)

        client.on_connect = on_connect
        client.on_message = on_message
        mqtt_port = int(os.getenv("MQTT_PORT", "1883"))
        client.connect_async(mqtt_host, mqtt_port, 60)
        client.loop_start()
    except Exception as e:
        logger.warning(f"MQTT startup failed: {e}")


from sqlalchemy import text
from db import engine

@app.on_event("startup")
async def startup():
    _start_mqtt()
    
    # Initialize database tables
    try:
        schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
        if os.path.exists(schema_path):
            with open(schema_path, "r") as f:
                statements = f.read().split(";")
            async with engine.begin() as conn:
                for stmt in statements:
                    if stmt.strip():
                        await conn.execute(text(stmt))
            logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}")

    logger.info("Eco-Assist API started successfully")


@app.get("/")
async def root():
    return {"message": "Eco-Assist API", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
