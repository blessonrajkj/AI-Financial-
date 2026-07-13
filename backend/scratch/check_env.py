import os
from app.core.config import settings

print("ENV DATABASE URL:", os.environ.get("DATABASE_URL"))
print("ENV POSTGRES_SERVER:", os.environ.get("POSTGRES_SERVER"))
print("SETTINGS DB URL:", settings.get_database_url())
