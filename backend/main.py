"""ERLC race backend: protected read-only polling and Firestore synchronization.
No automatic lap timing until validated player coordinates are available.
"""
import os
import time
import threading
import logging
from datetime import datetime, timezone
import requests
import firebase_admin
from firebase_admin import firestore
from flask import Flask, jsonify

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)
firebase_admin.initialize_app()
db = firestore.client()
API_URL = "https://api.erlc.gg/v2/server"
INTERVAL = max(10, int(os.getenv("POLL_INTERVAL_SECONDS", "30")))
KEY = os.getenv("ERLC_SERVER_KEY", "")
RUN_POLLING = os.getenv("RUN_POLLING", "false").lower() == "true"
last_state = {"status": "starting", "last_success": None, "player_count": None, "error": None}
state_lock = threading.Lock()

def extract_players(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        section = payload.get("Players", payload.get("players", []))
        return section if isinstance(section, list) else []
    return []

def fetch_snapshot():
    if not KEY:
        raise RuntimeError("ERLC_SERVER_KEY secret is not configured")
    response = requests.get(API_URL, params={"Players": "true"}, headers={"Server-Key": KEY}, timeout=20)
    response.raise_for_status()
    payload = response.json()
    players = extract_players(payload)
    # Do not store entire API response: it may contain data not intended for spectators.
    return {"count": len(players), "received_at": datetime.now(timezone.utc).isoformat()}

def sync_once():
    try:
        snap = fetch_snapshot()
        db.collection("races").document("apiStatus").set({
            "status": "connected",
            "playerCount": snap["count"],
            "lastSuccess": firestore.SERVER_TIMESTAMP,
            "source": "ERLC API v2",
            "autoTimingActive": False,
        }, merge=True)
        with state_lock:
            last_state.update(status="connected", player_count=snap["count"], last_success=snap["received_at"], error=None)
    except Exception as exc:
        logging.warning("ERLC polling failed: %s", type(exc).__name__)
        with state_lock:
            last_state.update(status="error", error=type(exc).__name__)
        try:
            db.collection("races").document("apiStatus").set({
                "status": "error", "autoTimingActive": False,
                "lastAttempt": firestore.SERVER_TIMESTAMP,
            }, merge=True)
        except Exception:
            logging.exception("Firestore status update failed")

def poll_forever():
    while True:
        sync_once()
        time.sleep(INTERVAL)

@app.get("/health")
def health():
    with state_lock:
        return jsonify(dict(last_state, auto_timing_active=False))

@app.get("/")
def root():
    return jsonify({"service": "Urban Storm Rally ERLC monitor", "auto_timing_active": False})

if RUN_POLLING:
    threading.Thread(target=poll_forever, daemon=True, name="erlc-poll",).start()
