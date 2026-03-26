"""Admin-only routes for the web console dashboard."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..models.kiosk import Kiosk
from ..models.session import KioskSession
from ..models.bottle_deposit import BottleDeposit
from ..models.credit_transaction import CreditTransaction
from ..models.charging_session import ChargingSession
from ..models.device_telemetry import DeviceTelemetry

admin_bp = Blueprint("admin", __name__)


def _require_admin():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    return user if (user and user.is_admin) else None


@admin_bp.get("/kiosks")
@jwt_required()
def list_kiosks():
    if not _require_admin():
        return jsonify({"error": "admin only"}), 403
    kiosks = Kiosk.query.order_by(Kiosk.name).all()
    return jsonify([k.to_dict() for k in kiosks])


@admin_bp.get("/kiosks/<int:kiosk_id>/telemetry/latest")
@jwt_required()
def latest_telemetry(kiosk_id):
    if not _require_admin():
        return jsonify({"error": "admin only"}), 403
    latest = (
        DeviceTelemetry.query.filter_by(kiosk_id=kiosk_id)
        .order_by(DeviceTelemetry.timestamp.desc())
        .first()
    )
    if not latest:
        return jsonify({"error": "no telemetry found"}), 404
    return jsonify(latest.to_dict())


@admin_bp.get("/sessions")
@jwt_required()
def list_sessions():
    if not _require_admin():
        return jsonify({"error": "admin only"}), 403
    sessions = (
        KioskSession.query.order_by(KioskSession.started_at.desc()).limit(100).all()
    )
    return jsonify([s.to_dict() for s in sessions])


@admin_bp.get("/deposits")
@jwt_required()
def list_deposits():
    if not _require_admin():
        return jsonify({"error": "admin only"}), 403
    page = request.args.get("page", 1, type=int)
    deposits = (
        BottleDeposit.query.order_by(BottleDeposit.timestamp.desc())
        .paginate(page=page, per_page=50, error_out=False)
    )
    return jsonify({
        "deposits": [d.to_dict() for d in deposits.items],
        "total": deposits.total,
        "pages": deposits.pages,
        "page": deposits.page,
    })


@admin_bp.get("/charging")
@jwt_required()
def list_charging():
    if not _require_admin():
        return jsonify({"error": "admin only"}), 403
    page = request.args.get("page", 1, type=int)
    status = request.args.get("status")
    q = ChargingSession.query.order_by(ChargingSession.started_at.desc())
    if status:
        q = q.filter_by(status=status)
    sessions = q.paginate(page=page, per_page=50, error_out=False)
    return jsonify({
        "sessions": [s.to_dict() for s in sessions.items],
        "total": sessions.total,
        "pages": sessions.pages,
        "page": sessions.page,
    })


@admin_bp.get("/transactions")
@jwt_required()
def list_transactions():
    if not _require_admin():
        return jsonify({"error": "admin only"}), 403
    page = request.args.get("page", 1, type=int)
    txns = (
        CreditTransaction.query.order_by(CreditTransaction.timestamp.desc())
        .paginate(page=page, per_page=50, error_out=False)
    )
    return jsonify({
        "transactions": [t.to_dict() for t in txns.items],
        "total": txns.total,
        "pages": txns.pages,
        "page": txns.page,
    })


@admin_bp.get("/users")
@jwt_required()
def list_users():
    if not _require_admin():
        return jsonify({"error": "admin only"}), 403
    users = User.query.order_by(User.created_at.desc()).limit(100).all()
    return jsonify([u.to_dict() for u in users])


@admin_bp.get("/overview")
@jwt_required()
def overview():
    if not _require_admin():
        return jsonify({"error": "admin only"}), 403
    return jsonify({
        "total_users": User.query.count(),
        "total_deposits": BottleDeposit.query.count(),
        "active_charging": ChargingSession.query.filter_by(status="active").count(),
        "total_credits_earned": sum(
            t.amount for t in CreditTransaction.query.filter_by(type="EARN").all()
        ),
        "kiosks_online": Kiosk.query.filter_by(status="online").count(),
    })
