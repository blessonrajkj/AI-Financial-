from sqlalchemy.orm import Session
from app.core.database import Base, engine, SessionLocal
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

DEFAULT_CATEGORIES = [
    {"name": "Food", "type": "expense"},
    {"name": "Groceries", "type": "expense"},
    {"name": "Transportation", "type": "expense"},
    {"name": "Healthcare", "type": "expense"},
    {"name": "Entertainment", "type": "expense"},
    {"name": "Education", "type": "expense"},
    {"name": "Shopping", "type": "expense"},
    {"name": "Utilities", "type": "expense"},
    {"name": "Travel", "type": "expense"},
    {"name": "Fuel", "type": "expense"},
    {"name": "Insurance", "type": "expense"},
    {"name": "Bills", "type": "expense"},
    {"name": "Investments", "type": "expense"},
    {"name": "Subscriptions", "type": "expense"},
    {"name": "Miscellaneous", "type": "expense"},
    {"name": "Recharge", "type": "expense"},
    {"name": "Salary", "type": "income"},
    {"name": "Refunds", "type": "income"},
    {"name": "Other Income", "type": "income"},
]

def init_db(db: Session):
    # Check if we have categories
    existing_categories_count = db.query(Category).count()
    if existing_categories_count == 0:
        print("Inserting default categories...")
        for cat in DEFAULT_CATEGORIES:
            db_cat = Category(name=cat["name"], type=cat["type"], user_id=None)
            db.add(db_cat)
        db.commit()
        print("Default categories inserted successfully.")

def create_tables():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")
    
    # SQLite dynamic column migration check
    db = SessionLocal()
    try:
        from sqlalchemy import text
        # Check if transactions table has columns
        cursor = db.execute(text("PRAGMA table_info(transactions);"))
        columns = [row[1] for row in cursor.fetchall()]
        
        migrations = [
            ("import_batch_id", "ALTER TABLE transactions ADD COLUMN import_batch_id VARCHAR;"),
            ("transaction_id", "ALTER TABLE transactions ADD COLUMN transaction_id VARCHAR;"),
            ("reference_number", "ALTER TABLE transactions ADD COLUMN reference_number VARCHAR;"),
            ("bank", "ALTER TABLE transactions ADD COLUMN bank VARCHAR;"),
            ("balance", "ALTER TABLE transactions ADD COLUMN balance FLOAT;"),
            ("time", "ALTER TABLE transactions ADD COLUMN time VARCHAR;")
        ]
        
        for col_name, sql in migrations:
            if col_name not in columns:
                print(f"Migrating: Adding {col_name} column to transactions table...")
                db.execute(text(sql))
                db.commit()
                print(f"{col_name} column added successfully.")
        
        init_db(db)
    except Exception as e:
        print(f"Error during db table creation/migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
