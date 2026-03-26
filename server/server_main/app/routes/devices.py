"""Routes consumed by the ESP32 device (not the user browser)."""
from datetime import datetime, timezone
from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from ..extensions import db
from ..models.kiosk import Kiosk
from ..models.device_telemetry import DeviceTelemetry
from ..models.charging_session import ChargingSession
from ..services.command_service import get_pending_commands, ack_command

devices_bp = Blueprint("devices", __name__)


def require_device_key(f):
    """Decorator: validates the device API key from Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        token = auth.removeprefix("Bearer ").strip()
        if token != current_app.config["DEVICE_API_KEY"]:
            return jsonify({"error": "unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def _resolve_kiosk() -> tuple[Kiosk | None, dict | None]:
    """Read kiosk_id from query string or JSON body, return kiosk or error response."""
    kiosk_id = request.args.get("kiosk_id") or (request.get_json(silent=True) or {}).get("kiosk_id")
    if not kiosk_id:
        return None, ({"error": "kiosk_id is required"}, 400)
    kiosk = Kiosk.query.get(int(kiosk_id))
    if not kiosk:
        return None, ({"error": "kiosk not found"}, 404)
    return kiosk, None


@devices_bp.get("/commands")
@require_device_key
def poll_commands():
    """ESP32 calls this every 2 seconds to get pending commands."""
    kiosk, err = _resolve_kiosk()
    if err:
        return jsonify(err[0]), err[1]

    kiosk.touch()
    db.session.commit()

    pending = get_pending_commands(kiosk.id)
    return jsonify({"commands": [c.to_dict() for c in pending]})


@devices_bp.post("/commands/<int:command_id>/ack")
@require_device_key
def ack(command_id):
    """ESP32 calls this after executing a command."""
    kiosk, err = _resolve_kiosk()
    if err:
        return jsonify(err[0]), err[1]

    cmd = ack_command(command_id, kiosk.id)
    if not cmd:
        return jsonify({"error": "command not found or already acked"}), 404

    db.session.commit()
    return jsonify({"acked": command_id})


@devices_bp.post("/telemetry")
@require_device_key
def receive_telemetry():
    """ESP32 posts sensor readings every 5 seconds."""
    data = request.get_json(silent=True) or {}
    kiosk_id = data.get("kiosk_id")

    if not kiosk_id:
        return jsonify({"error": "kiosk_id is required"}), 400

    kiosk = Kiosk.query.get(int(kiosk_id))
    if not kiosk:
        return jsonify({"error": "kiosk not found"}), 404

    kiosk.touch()

    telemetry = DeviceTelemetry(kiosk_id=kiosk.id)
    telemetry.set_port_data(data.get("ports", []))
    telemetry.bin_level = data.get("bin_level")
    db.session.add(telemetry)

    # Auto-complete charging sessions whose duration has elapsed
    _auto_complete_expired_sessions(kiosk.id)

    db.session.commit()
    return jsonify({"received": True})


def _auto_complete_expired_sessions(kiosk_id: int):
    """Mark charging sessions as completed if their duration has passed."""
    from ..services.command_service import queue_command
    active = ChargingSession.query.filter_by(kiosk_id=kiosk_id, status="active").all()
    now = datetime.now(timezone.utc)
    for session in active:
        elapsed = (now - session.started_at.replace(tzinfo=timezone.utc)).total_seconds()
        if elapsed >= session.duration_seconds:
            session.complete()
            queue_command(kiosk_id, "deactivate_port", {"port": session.port_number})
