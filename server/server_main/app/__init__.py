from flask import Flask
from flask_cors import CORS
from .config import get_config
from .extensions import db, migrate, jwt, init_supabase


def create_app():
    app = Flask(__name__)
    app.config.from_object(get_config())
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    init_supabase(app.config["SUPABASE_URL"], app.config["SUPABASE_SERVICE_KEY"])

    with app.app_context():
        from .models import user, kiosk, session, bottle_deposit  # noqa: F401
        from .models import credit_transaction, charging_session   # noqa: F401
        from .models import device_command, device_telemetry       # noqa: F401

        from .routes.auth import auth_bp
        from .routes.users import users_bp
        from .routes.kiosk import kiosk_bp
        from .routes.charging import charging_bp
        from .routes.devices import devices_bp
        from .routes.admin import admin_bp

        app.register_blueprint(auth_bp,     url_prefix="/api/auth")
        app.register_blueprint(users_bp,    url_prefix="/api/users")
        app.register_blueprint(kiosk_bp,    url_prefix="/api/kiosk")
        app.register_blueprint(charging_bp, url_prefix="/api/charging")
        app.register_blueprint(devices_bp,  url_prefix="/api/devices")
        app.register_blueprint(admin_bp,    url_prefix="/api/admin")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
