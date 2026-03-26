from datetime import datetime, timezone
from ..extensions import db


class KioskSession(db.Model):
    __tablename__ = "sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    kiosk_id = db.Column(db.Integer, db.ForeignKey("kiosks.id"), nullable=False, index=True)
    started_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    ended_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", back_populates="sessions")
    kiosk = db.relationship("Kiosk", back_populates="sessions")
    bottle_deposits = db.relationship(
        "BottleDeposit", back_populates="session", lazy="dynamic"
    )

    def end(self):
        self.ended_at = datetime.now(timezone.utc)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "kiosk_id": self.kiosk_id,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
        }
