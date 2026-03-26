import json
from datetime import datetime, timezone
from ..extensions import db


class DeviceCommand(db.Model):
    __tablename__ = "device_commands"

    id = db.Column(db.Integer, primary_key=True)
    kiosk_id = db.Column(db.Integer, db.ForeignKey("kiosks.id"), nullable=False, index=True)
    command_type = db.Column(db.String(60), nullable=False)
    # JSON payload e.g. {"port": 2, "duration_seconds": 600}
    payload = db.Column(db.Text, nullable=True)
    status = db.Column(
        db.Enum("PENDING", "ACKED", "FAILED"),
        default="PENDING",
        nullable=False,
        index=True,
    )
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    acked_at = db.Column(db.DateTime, nullable=True)

    kiosk = db.relationship("Kiosk", back_populates="device_commands")

    def get_payload(self) -> dict:
        if self.payload:
            return json.loads(self.payload)
        return {}

    def set_payload(self, data: dict):
        self.payload = json.dumps(data)

    def ack(self):
        self.status = "ACKED"
        self.acked_at = datetime.now(timezone.utc)

    def to_dict(self):
        return {
            "id": self.id,
            "command_type": self.command_type,
            "payload": self.get_payload(),
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "acked_at": self.acked_at.isoformat() if self.acked_at else None,
        }
