from datetime import datetime, timezone
from ..extensions import db


class Kiosk(db.Model):
    __tablename__ = "kiosks"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(255), nullable=True)
    api_key = db.Column(db.String(64), unique=True, nullable=False, index=True)
    status = db.Column(
        db.Enum("online", "offline", "error"), default="offline", nullable=False
    )
    last_seen_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    sessions = db.relationship("KioskSession", back_populates="kiosk", lazy="dynamic")
    device_commands = db.relationship(
        "DeviceCommand", back_populates="kiosk", lazy="dynamic"
    )
    device_telemetry = db.relationship(
        "DeviceTelemetry", back_populates="kiosk", lazy="dynamic"
    )
    charging_sessions = db.relationship(
        "ChargingSession", back_populates="kiosk", lazy="dynamic"
    )

    def touch(self):
        self.last_seen_at = datetime.now(timezone.utc)
        self.status = "online"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "status": self.status,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
            "created_at": self.created_at.isoformat(),
        }
