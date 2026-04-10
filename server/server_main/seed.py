"""
Seed script — creates the admin user and default kiosk.
Reads credentials from .env so nothing sensitive is hardcoded.

Usage:
    cd server/server_main
    python seed.py
"""
import os
import secrets
from dotenv import load_dotenv
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.kiosk import Kiosk

load_dotenv()

ADMIN_NAME     = os.environ.get("ADMIN_NAME",     "EcoCharge Admin")
ADMIN_EMAIL    = os.environ.get("ADMIN_EMAIL",    "admin@ecocharge.ph")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123!")
KIOSK_NAME     = os.environ.get("KIOSK_NAME",     "Kiosk-001")
KIOSK_LOCATION = os.environ.get("KIOSK_LOCATION", "Main Building Lobby")
DEVICE_API_KEY = os.environ.get("DEVICE_API_KEY", secrets.token_hex(32))

if not ADMIN_PASSWORD:
    raise SystemExit("ERROR: ADMIN_PASSWORD is not set in .env — aborting seed.")

app = create_app()

with app.app_context():
    # Admin user
    if not User.query.filter_by(email=ADMIN_EMAIL).first():
        admin = User(
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            qr_code=secrets.token_hex(16),
            is_admin=True,
        )
        admin.set_password(ADMIN_PASSWORD)
        db.session.add(admin)
        print(f"Created admin: {ADMIN_EMAIL}")
    else:
        print(f"Admin already exists: {ADMIN_EMAIL} (skipped)")

    # Default kiosk
    if not Kiosk.query.filter_by(name=KIOSK_NAME).first():
        kiosk = Kiosk(
            name=KIOSK_NAME,
            location=KIOSK_LOCATION,
            api_key=DEVICE_API_KEY,
        )
        db.session.add(kiosk)
        db.session.commit()
        kiosk = Kiosk.query.filter_by(name=KIOSK_NAME).first()
        print(f"Created kiosk: {KIOSK_NAME}")
        print(f"  Kiosk API key: {kiosk.api_key}")
        print(f"  >> Set DEVICE_API_KEY={kiosk.api_key} in your .env and ESP32 firmware")
    else:
        kiosk = Kiosk.query.filter_by(name=KIOSK_NAME).first()
        print(f"Kiosk already exists: {KIOSK_NAME} (skipped)")
        print(f"  Kiosk API key: {kiosk.api_key}")

    db.session.commit()
    print("Seed complete.")
