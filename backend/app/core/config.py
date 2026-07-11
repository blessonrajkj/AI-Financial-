import os
from typing import List, Union
from pydantic import AnyHttpUrl, validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "WealthPilot AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkeychangeinproduction1234567890"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    BACKEND_CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://10.178.84.28:3000",
]

    # Database
    POSTGRES_SERVER: str | None = None
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "kjbb2320"
    POSTGRES_DB: str = "finance_db"
    POSTGRES_PORT: str = "5432"
    DATABASE_URL: str = "sqlite:///./finance.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Keys
    GEMINI_API_KEY: str | None = None

    # Storage paths
    UPLOAD_DIR: str = "uploads"

    class Config:
        case_sensitive = True
        env_file = ".env"

    def get_database_url(self) -> str:
        # Prioritize standard DATABASE_URL env var (e.g. from Render or Heroku)
        env_db_url = os.environ.get("DATABASE_URL")
        if env_db_url:
            if env_db_url.startswith("postgres://"):
                env_db_url = env_db_url.replace("postgres://", "postgresql://", 1)
            return env_db_url

        # If POSTGRES_SERVER is set, use PostgreSQL
        pg_server = os.environ.get("POSTGRES_SERVER") or self.POSTGRES_SERVER
        if pg_server:
            user = os.environ.get("POSTGRES_USER") or self.POSTGRES_USER
            password = os.environ.get("POSTGRES_PASSWORD") or self.POSTGRES_PASSWORD
            db = os.environ.get("POSTGRES_DB") or self.POSTGRES_DB
            port = os.environ.get("POSTGRES_PORT") or self.POSTGRES_PORT
            return f"postgresql://{user}:{password}@{pg_server}:{port}/{db}"
        return self.DATABASE_URL

settings = Settings()
# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
