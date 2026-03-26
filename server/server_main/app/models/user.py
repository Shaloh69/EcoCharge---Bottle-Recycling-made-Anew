from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    qr_code = db.Column(db.String(64), unique=True, nullable=True)
    credit_balance = db.Column(db.Integer, default=0, nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    sessions = db.relationship("KioskSession", back_populates="user", lazy="dynamic")
    credit_transactions = db.relationship(
        "CreditTransaction", back_populates="user", lazy="dynamic"
    )
    charging_sessions = db.relationship(
        "ChargingSession", back_populates="user", lazy="dynamic"
    )

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "qr_code": self.qr_code,
            "credit_balance": self.credit_balance,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat(),
        }
