from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..models.credit_transaction import CreditTransaction
from ..models.bottle_deposit import BottleDeposit
from ..models.session import KioskSession
from ..extensions import db, supabase

users_bp = Blueprint("users", __name__)


def _get_current_user() -> User | None:
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


@users_bp.get("/me")
@jwt_required()
def me():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404
    return jsonify(user.to_dict())


@users_bp.get("/me/credits")
@jwt_required()
def my_credits():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404
    return jsonify({"credit_balance": user.credit_balance})


@users_bp.get("/me/deposits")
@jwt_required()
def my_deposits():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404
    session_ids = [s.id for s in KioskSession.query.filter_by(user_id=user.id).all()]
    deposits = (BottleDeposit.query
                .filter(BottleDeposit.session_id.in_(session_ids))
                .order_by(BottleDeposit.timestamp.desc())
                .limit(50).all())
    return jsonify([d.to_dict() for d in deposits])


@users_bp.get("/me/transactions")
@jwt_required()
def my_transactions():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404

    txns = (
        CreditTransaction.query.filter_by(user_id=user.id)
        .order_by(CreditTransaction.timestamp.desc())
        .limit(50)
        .all()
    )
    return jsonify([t.to_dict() for t in txns])


@users_bp.post("/me/avatar")
@jwt_required()
def upload_avatar():
    """Upload a profile picture to Supabase Storage."""
    if supabase is None:
        return jsonify({"error": "storage not configured"}), 503

    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    file = request.files["file"]
    if not file.content_type or not file.content_type.startswith("image/"):
        return jsonify({"error": "file must be an image"}), 400

    user = _get_current_user()
    if not user:
        return jsonify({"error": "user not found"}), 404

    bucket = current_app.config["SUPABASE_BUCKET"]
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    path = f"avatars/{user.id}.{ext}"

    file_bytes = file.read()
    supabase.storage.from_(bucket).upload(
        path, file_bytes,
        {"content-type": file.content_type, "upsert": "true"},
    )

    public_url = supabase.storage.from_(bucket).get_public_url(path)
    user.profile_picture_url = public_url
    db.session.commit()

    return jsonify({"profile_picture_url": public_url})
