from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from supabase import create_client, Client as SupabaseClient

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
supabase: SupabaseClient | None = None


def init_supabase(url: str, key: str) -> None:
    global supabase
    if url and key:
        supabase = create_client(url, key)
