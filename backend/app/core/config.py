import os
from typing import List, Union
from pydantic_settings import BaseSettings

KNOWN_INSECURE_SECRETS = {
    "supersecretkeychangeinproduction1234567890",
    "secret",
    "changeme",
    "default",
    "password",
    "12345678",
    "admin",
    "root",
    "dev-insecure-secret-key-change-in-production-min-32-chars",
    "dev-local-secret-key-pariview-for-development-32chars",
}

class Settings(BaseSettings):
    PROJECT_NAME: str = "PariView"
    API_V1_STR: str = "/api/v1"
    
    # Environment & Debugging
    ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")
    DEBUG: bool = os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes")
    
    # JWT & Security
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-insecure-secret-key-change-in-production-min-32-chars")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7))  # 7 days
    PRICE_UPDATE_INTERVAL_HOURS: int = int(os.environ.get("PRICE_UPDATE_INTERVAL_HOURS", 24))

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]

    # Database
    POSTGRES_SERVER: str | None = os.environ.get("POSTGRES_SERVER", None)
    POSTGRES_USER: str = os.environ.get("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.environ.get("POSTGRES_PASSWORD", "")
    POSTGRES_DB: str = os.environ.get("POSTGRES_DB", "pariview")
    POSTGRES_PORT: str = os.environ.get("POSTGRES_PORT", "5432")
    DATABASE_URL: str | None = os.environ.get("DATABASE_URL", None)

    # Redis
    REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # AI Keys
    GEMINI_API_KEY: str | None = os.environ.get("GEMINI_API_KEY", None)

    # Storage configuration
    UPLOAD_DIR: str = os.environ.get("UPLOAD_DIR", "uploads")
    STORAGE_BACKEND: str = os.environ.get("STORAGE_BACKEND", "local")  # "local" or "s3"
    S3_ENDPOINT_URL: str | None = os.environ.get("S3_ENDPOINT_URL", None)
    S3_BUCKET_NAME: str = os.environ.get("S3_BUCKET_NAME", "pariview-uploads")
    S3_REGION: str = os.environ.get("S3_REGION", "us-east-1")
    S3_ACCESS_KEY_ID: str | None = os.environ.get("S3_ACCESS_KEY_ID", None)
    S3_SECRET_ACCESS_KEY: str | None = os.environ.get("S3_SECRET_ACCESS_KEY", None)

    class Config:
        case_sensitive = True
        env_file = ".env"

    def validate_security(self):
        """Enforces security rules based on active environment."""
        is_production = self.ENVIRONMENT.lower() in ("production", "prod")
        if is_production:
            if self.DEBUG:
                raise RuntimeError("Production security error: DEBUG must be set to False in production.")
            
            secret = (self.SECRET_KEY or "").strip()
            if not secret or len(secret) < 32 or secret.lower() in KNOWN_INSECURE_SECRETS:
                raise RuntimeError(
                    "Production startup aborted: Insecure or missing SECRET_KEY. "
                    "In production, SECRET_KEY must be a cryptographically random secret "
                    "at least 32 characters long and not a known default."
                )

    def get_database_url(self) -> str:
        # Prioritize explicit DATABASE_URL env var
        env_db_url = os.environ.get("DATABASE_URL") or self.DATABASE_URL
        if env_db_url:
            if env_db_url.startswith("postgres://"):
                return env_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif env_db_url.startswith("postgresql://"):
                return env_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return env_db_url

        # If POSTGRES_SERVER is set, construct PostgreSQL URL
        pg_server = os.environ.get("POSTGRES_SERVER") or self.POSTGRES_SERVER
        if pg_server:
            user = os.environ.get("POSTGRES_USER") or self.POSTGRES_USER
            password = os.environ.get("POSTGRES_PASSWORD") or self.POSTGRES_PASSWORD
            db = os.environ.get("POSTGRES_DB") or self.POSTGRES_DB
            port = os.environ.get("POSTGRES_PORT") or self.POSTGRES_PORT
            if password:
                return f"postgresql+psycopg2://{user}:{password}@{pg_server}:{port}/{db}"
            return f"postgresql+psycopg2://{user}@{pg_server}:{port}/{db}"
            
        # Default fallback to SQLite for zero-config local development/testing
        return "sqlite:///./finance.db"

settings = Settings()
settings.validate_security()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
