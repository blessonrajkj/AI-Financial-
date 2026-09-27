import pytest
from alembic.config import Config
from alembic import command
from app.core.config import settings
from app.core.database import engine
from sqlalchemy import inspect

def test_alembic_schema_and_tables():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    expected_tables = [
        "users",
        "user_profiles",
        "linked_banks",
        "user_settings",
        "categories",
        "merchants",
        "transactions",
        "budgets",
        "subscriptions",
        "notifications",
        "investments",
        "savings_goals",
        "receipts",
        "voice_logs",
        "chat_history",
        "india_post_investments",
        "import_logs",
        "import_batches",
        "alembic_version"
    ]
    
    for table in expected_tables:
        assert table in tables, f"Expected table '{table}' missing in PostgreSQL database"

def test_transaction_numeric_columns():
    inspector = inspect(engine)
    columns = {col["name"]: col for col in inspector.get_columns("transactions")}
    
    assert "amount" in columns
    assert "balance" in columns
    assert "debit_amount" in columns
    assert "credit_amount" in columns
