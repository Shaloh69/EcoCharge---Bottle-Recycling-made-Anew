from datetime import datetime, timezone
from ..extensions import db


class CreditTransaction(db.Model):
    __tablename__ = "credit_transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.Enum("EARN", "SPEND"), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    balance_after = db.Column(db.Integer, nullable=False)
    ref_type = db.Column(db.String(60), nullable=True)   # "bottle_deposit" | "charging_session"
    ref_id = db.Column(db.Integer, nullable=True)
    timestamp = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user = db.relationship("User", back_populates="credit_transactions")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "amount": self.amount,
            "balance_after": self.balance_after,
            "ref_type": self.ref_type,
            "ref_id": self.ref_id,
            "timestamp": self.timestamp.isoformat(),
        }
