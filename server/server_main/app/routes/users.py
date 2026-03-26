from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.user import User
from ..models.credit_transaction import CreditTransaction

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
