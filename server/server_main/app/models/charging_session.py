from datetime import datetime, timezone
from ..extensions import db


class ChargingSession(db.Model):
    __tablename__ = "charging_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    kiosk_id = db.Column(db.Integer, db.ForeignKey("kiosks.id"), nullable=False, index=True)
    port_number = db.Column(db.Integer, nullable=False)   # 1-4
    credits_used = db.Column(db.Integer, nullable=False)
    duration_seconds = db.Column(db.Integer, nullable=False)
    started_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    ended_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(
        db.Enum("active", "completed", "interrupted", "error"),
        default="active",
        nullable=False,
    )

    user = db.relationship("User", back_populates="charging_sessions")
    kiosk = db.relationship("Kiosk", back_populates="charging_sessions")

    def complete(self):
        self.ended_at = datetime.now(timezone.utc)
        self.status = "completed"

    def interrupt(self):
        self.ended_at = datetime.now(timezone.utc)
        self.status = "interrupted"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "kiosk_id": self.kiosk_id,
            "port_number": self.port_number,
            "credits_used": self.credits_used,
            "duration_seconds": self.duration_seconds,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "status": self.status,
        }
