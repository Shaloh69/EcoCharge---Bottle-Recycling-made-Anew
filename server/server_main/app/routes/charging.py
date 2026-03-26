from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.user import User
from ..models.kiosk import Kiosk
from ..models.charging_session import ChargingSession
from ..services.credit_service import spend_credits
from ..services.command_service import queue_command

charging_bp = Blueprint("charging", __name__)


def _get_current_user() -> User | None:
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


@charging_bp.post("/start")
@jwt_required()
def start_charging():
    data = request.get_json(silent=True) or {}

    kiosk_id = data.get("kiosk_id")
    port_number = data.get("port_number")
    credits_to_use = int(data.get("credits", 1))

    if not kiosk_id or not port_number:
        return jsonify({"error": "kiosk_id and port_number are required"}), 400

    if port_number not in (1, 2, 3, 4):
        return jsonify({"error": "port_number must be 1-4"}), 400

    kiosk = Kiosk.query.get(kiosk_id)
    if not kiosk:
        return jsonify({"error": "kiosk not found"}), 404

    user = _get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404

    minutes_per_credit = current_app.config["MINUTES_PER_CREDIT"]
    duration_seconds = credits_to_use * minutes_per_credit * 60

    # Check port not already active
    active = ChargingSession.query.filter_by(
        kiosk_id=kiosk_id, port_number=port_number, status="active"
    ).first()
    if active:
        return jsonify({"error": f"port {port_number} is already in use"}), 409

    charging = ChargingSession(
        user_id=user.id,
        kiosk_id=kiosk_id,
        port_number=port_number,
        credits_used=credits_to_use,
        duration_seconds=duration_seconds,
    )
    db.session.add(charging)
    db.session.flush()

    spend_credits(user, credits_to_use, "charging_session", charging.id)

    queue_command(
        kiosk_id,
        "activate_port",
        {"port": port_number, "duration_seconds": duration_seconds},
    )

    db.session.commit()

    return jsonify(
        {
            "charging_session": charging.to_dict(),
            "new_balance": user.credit_balance,
        }
    ), 201


@charging_bp.post("/stop/<int:charging_id>")
@jwt_required()
def stop_charging(charging_id):
    user = _get_current_user()
    charging = ChargingSession.query.filter_by(
        id=charging_id, user_id=user.id, status="active"
    ).first()
    if not charging:
        return jsonify({"error": "active charging session not found"}), 404

    charging.interrupt()
    queue_command(charging.kiosk_id, "deactivate_port", {"port": charging.port_number})
    db.session.commit()

    return jsonify({"charging_session": charging.to_dict()})


@charging_bp.get("/active")
@jwt_required()
def active_sessions():
    user = _get_current_user()
    sessions = ChargingSession.query.filter_by(user_id=user.id, status="active").all()
    return jsonify([s.to_dict() for s in sessions])
