import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import Base

# Import all models to ensure they are registered with Base.metadata
from app.models.user import User
from app.models.category_merchant import Category, Merchant
from app.models.receipt import Receipt
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.subscription import Subscription
from app.models.notification import Notification
from app.models.investment import Investment
from app.models.chat_history import ChatHistory
from app.models.voice_log import VoiceLog
from app.models.savings_goal import SavingsGoal
from app.models.india_post_investment import IndiaPostInvestment
from app.models.profile import UserProfile, LinkedBank, UserSettings
from app.models.import_log import ImportLog
from app.models.import_batch import ImportBatch

# Alembic Config object
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.get_database_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
