"""
Seed script — creates an admin user and a test kiosk for local development.

Usage:
    cd server/server_main
    python seed.py
"""
import secrets
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.kiosk import Kiosk

app = create_app()

with app.app_context():
    db.create_all()

    if not User.query.filter_by(email="admin@ecocharge.local").first():
        admin = User(
            name="Admin",
            email="admin@ecocharge.local",
            qr_code=secrets.token_hex(16),
            is_admin=True,
        )
        admin.set_password("admin1234")
        db.session.add(admin)
        print("Created admin user: admin@ecocharge.local / admin1234")

    if not Kiosk.query.filter_by(name="Kiosk-001").first():
        kiosk = Kiosk(
            name="Kiosk-001",
            location="UC Lapu-Lapu and Mandaue",
            api_key=secrets.token_hex(32),
        )
        db.session.add(kiosk)
        print(f"Created kiosk: Kiosk-001")

    db.session.commit()
    print("Seed complete.")

    kiosk = Kiosk.query.filter_by(name="Kiosk-001").first()
    print(f"  Kiosk API key (set as DEVICE_API_KEY in ESP32 firmware): {kiosk.api_key}")
