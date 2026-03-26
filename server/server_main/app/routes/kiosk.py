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
