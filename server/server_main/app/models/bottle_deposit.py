from datetime import datetime, timezone
from ..extensions import db


class BottleDeposit(db.Model):
    __tablename__ = "bottle_deposits"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(
        db.Integer, db.ForeignKey("sessions.id"), nullable=False, index=True
    )
    brand = db.Column(db.String(60), nullable=True)
    volume_ml = db.Column(db.Integer, nullable=True)
    condition = db.Column("condition", db.Enum("perfect", "imperfect"), nullable=True)
    confidence = db.Column(db.Float, nullable=True)
    credits_awarded = db.Column(db.Integer, default=0, nullable=False)
    timestamp = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    session = db.relationship("KioskSession", back_populates="bottle_deposits")

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "brand": self.brand,
            "volume_ml": self.volume_ml,
            "condition": self.condition,
            "confidence": self.confidence,
            "credits_awarded": self.credits_awarded,
            "timestamp": self.timestamp.isoformat(),
        }
