from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.user import User
from ..models.kiosk import Kiosk
from ..models.session import KioskSession
from ..models.bottle_deposit import BottleDeposit
from ..services.credit_service import award_credits
from ..services.command_service import queue_command

kiosk_bp = Blueprint("kiosk", __name__)


def _get_current_user() -> User | None:
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


@kiosk_bp.post("/sessions")
@jwt_required()
def start_session():
    data = request.get_json(silent=True) or {}
    kiosk_id = data.get("kiosk_id")

    if not kiosk_id:
        return jsonify({"error": "kiosk_id is required"}), 400

    kiosk = Kiosk.query.get(kiosk_id)
    if not kiosk:
        return jsonify({"error": "kiosk not found"}), 404

    user = _get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404

    session = KioskSession(user_id=user.id, kiosk_id=kiosk.id)
    db.session.add(session)
    db.session.commit()

    return jsonify(session.to_dict()), 201


@kiosk_bp.delete("/sessions/<int:session_id>")
@jwt_required()
def end_session(session_id):
    user = _get_current_user()
    session = KioskSession.query.filter_by(id=session_id, user_id=user.id).first()
    if not session:
        return jsonify({"error": "session not found"}), 404

    session.end()
    db.session.commit()
    return jsonify(session.to_dict())


@kiosk_bp.post("/deposits")
@jwt_required()
def record_deposit():
    """Called by the kiosk UI after the AI server returns a detection result."""
    data = request.get_json(silent=True) or {}

    session_id = data.get("session_id")
    brand = data.get("brand")
    volume_ml = data.get("volume_ml")
    condition = data.get("condition")
    confidence = data.get("confidence")

    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    user = _get_current_user()
    session = KioskSession.query.filter_by(id=session_id, user_id=user.id).first()
    if not session:
        return jsonify({"error": "session not found"}), 404

    credits = current_app.config["CREDITS_PER_BOTTLE"]

    deposit = BottleDeposit(
        session_id=session.id,
        brand=brand,
        volume_ml=volume_ml,
        condition=condition,
        confidence=confidence,
        credits_awarded=credits,
    )
    db.session.add(deposit)
    db.session.flush()

    txn = award_credits(user, credits, "bottle_deposit", deposit.id)

    # Tell the ESP32 to open the conveyor
    queue_command(session.kiosk_id, "open_conveyor", {})

    db.session.commit()

    return jsonify(
        {
            "deposit": deposit.to_dict(),
            "credits_awarded": credits,
            "new_balance": user.credit_balance,
            "transaction": txn.to_dict(),
        }
    ), 201


import time as _time

# Temporary in-memory store for QR link sessions: token -> {user_id, session_id, expires}
_qr_pending: dict = {}


@kiosk_bp.post("/qr-link")
@jwt_required()
def qr_link():
    """Flutter app calls this after scanning kiosk QR code."""
    data = request.get_json(silent=True) or {}
    session_token = data.get("session_token")
    kiosk_id = data.get("kiosk_id")

    if not session_token or not kiosk_id:
        return jsonify({"error": "session_token and kiosk_id are required"}), 400

    user = _get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404

    kiosk = Kiosk.query.get(int(kiosk_id))
    if not kiosk:
        return jsonify({"error": "kiosk not found"}), 404

    # Create a kiosk session for this user
    kiosk_session = KioskSession(user_id=user.id, kiosk_id=kiosk.id)
    db.session.add(kiosk_session)
    db.session.commit()

    # Store in pending dict so qr-status can return it
    _qr_pending[session_token] = {
        "user_id": user.id,
        "session_id": kiosk_session.id,
        "user": user.to_dict(),
        "expires": _time.time() + 300,
    }

    return jsonify({"session_id": kiosk_session.id, "kiosk": kiosk.to_dict()}), 201


@kiosk_bp.get("/qr-status")
def qr_status():
    """Kiosk web polls this to know when phone has linked."""
    token = request.args.get("token")
    if not token:
        return jsonify({"linked": False}), 200

    # Clean up expired entries
    now = _time.time()
    expired = [k for k, v in _qr_pending.items() if v["expires"] < now]
    for k in expired:
        del _qr_pending[k]

    entry = _qr_pending.get(token)
    if not entry:
        return jsonify({"linked": False}), 200

    from flask_jwt_extended import create_access_token
    access_token = create_access_token(identity=str(entry["user_id"]))
    # Remove after first successful read
    del _qr_pending[token]

    return jsonify({
        "linked": True,
        "access_token": access_token,
        "session_id": entry["session_id"],
        "user": entry["user"],
    })


@kiosk_bp.get("/list")
def list_kiosks_public():
    """Public kiosk listing for the Flutter mobile app."""
    kiosks = Kiosk.query.order_by(Kiosk.name).all()
    return jsonify([k.to_dict() for k in kiosks])
