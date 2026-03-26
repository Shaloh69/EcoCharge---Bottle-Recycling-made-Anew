import json
from datetime import datetime, timezone
from ..extensions import db


class DeviceTelemetry(db.Model):
    __tablename__ = "device_telemetry"

    id = db.Column(db.Integer, primary_key=True)
    kiosk_id = db.Column(db.Integer, db.ForeignKey("kiosks.id"), nullable=False, index=True)
    # JSON: {"ports": [{"port": 1, "voltage": 220.5, "current": 1.2, "relay_on": true}, ...]}
    port_data = db.Column(db.Text, nullable=True)
    bin_level = db.Column(db.Integer, nullable=True)   # 0-100 percent
    timestamp = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    kiosk = db.relationship("Kiosk", back_populates="device_telemetry")

    def get_port_data(self) -> list:
        if self.port_data:
            return json.loads(self.port_data)
        return []

    def set_port_data(self, data: list):
        self.port_data = json.dumps(data)

    def to_dict(self):
        return {
            "id": self.id,
            "kiosk_id": self.kiosk_id,
            "port_data": self.get_port_data(),
            "bin_level": self.bin_level,
            "timestamp": self.timestamp.isoformat(),
        }
