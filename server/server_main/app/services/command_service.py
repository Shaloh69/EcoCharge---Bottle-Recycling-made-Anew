from ..extensions import db
from ..models.device_command import DeviceCommand


def queue_command(kiosk_id: int, command_type: str, payload: dict = None) -> DeviceCommand:
    """Create a PENDING command for the ESP32 to pick up on next poll."""
    cmd = DeviceCommand(kiosk_id=kiosk_id, command_type=command_type)
    if payload:
        cmd.set_payload(payload)
    db.session.add(cmd)
    db.session.flush()  # get id before commit
    return cmd


def get_pending_commands(kiosk_id: int) -> list[DeviceCommand]:
    """Return all PENDING commands for a kiosk, oldest first."""
    return (
        DeviceCommand.query.filter_by(kiosk_id=kiosk_id, status="PENDING")
        .order_by(DeviceCommand.created_at.asc())
        .all()
    )


def ack_command(command_id: int, kiosk_id: int) -> DeviceCommand | None:
    """Mark a command as ACKED. Returns None if not found or wrong kiosk."""
    cmd = DeviceCommand.query.filter_by(
        id=command_id, kiosk_id=kiosk_id, status="PENDING"
    ).first()
    if cmd:
        cmd.ack()
        db.session.flush()
    return cmd
