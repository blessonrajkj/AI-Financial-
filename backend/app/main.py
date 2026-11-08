import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1.api import api_router
from app.db_init import create_tables
from app.middleware.rate_limit import RateLimitMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Set up CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Ensure folders exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "receipts"), exist_ok=True)

# Secure file serving router (authenticated and user-scoped, preventing directory traversal and public leakage)
from app.api.v1.endpoints.uploads import router as uploads_router
app.include_router(uploads_router, prefix="/uploads", tags=["secure-uploads"])

# Dynamic DB bootstrap on startup
@app.on_event("startup")
def on_startup():
    try:
        create_tables()
        from app.services.market_data import start_daily_price_updater
        asyncio.create_task(start_daily_price_updater())
    except Exception as e:
        print(f"Error during startup DB initialization: {e}")

# Include central router mapping
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME} API. Access documentation at /docs"
    }

@app.get("/health")
def health_check():
    from app.core.database import SessionLocal
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_type = "postgresql" if "postgresql" in settings.get_database_url() else "sqlite"
        return {
            "status": "ok",
            "database": "connected",
            "db_engine": db_type
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(e)
        }
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
