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
    # Expense Main Categories
    {"name": "Food & Dining", "type": "expense"},
    {"name": "Transportation", "type": "expense"},
    {"name": "Shopping", "type": "expense"},
    {"name": "Bills & Utilities", "type": "expense"},
    {"name": "Housing", "type": "expense"},
    {"name": "Health & Medical", "type": "expense"},
    {"name": "Education", "type": "expense"},
    {"name": "Entertainment", "type": "expense"},
    {"name": "Subscriptions", "type": "expense"},
    {"name": "Personal Care", "type": "expense"},
    {"name": "Travel", "type": "expense"},
    {"name": "Family & Household", "type": "expense"},
    {"name": "Financial", "type": "expense"},
    {"name": "Investments", "type": "expense"},
    {"name": "Cash & Transfers", "type": "expense"},
    {"name": "Donations & Charity", "type": "expense"},
    {"name": "Government & Taxes", "type": "expense"},
    {"name": "Business / Work", "type": "expense"},
    {"name": "Miscellaneous", "type": "expense"},
    # Legacy fallbacks
    {"name": "Food", "type": "expense"},
    {"name": "Groceries", "type": "expense"},
    {"name": "Fuel", "type": "expense"},
    {"name": "Bills", "type": "expense"},
    {"name": "Recharge", "type": "expense"},
    # Income Main Categories
    {"name": "Income", "type": "income"},
    {"name": "Salary", "type": "income"},
    {"name": "Refunds", "type": "income"},
    {"name": "Other Income", "type": "income"},
    # Transfer Categories
    {"name": "Cash & Transfers", "type": "transfer"},
]

def init_db(db: Session):
    # Ensure all default main categories exist in the database
    existing_cats = {c.name.lower(): c for c in db.query(Category).all()}
    for cat in DEFAULT_CATEGORIES:
        cat_key = cat["name"].lower()
        if cat_key not in existing_cats:
            db_cat = Category(name=cat["name"], type=cat["type"], user_id=None)
            db.add(db_cat)
    db.commit()

    # Check and seed default demo accounts
    from app.core.security import get_password_hash
    default_users = [
        {"email": "demo@pariview.com", "full_name": "Demo User", "password": "password123"},
        {"email": "test@example.com", "full_name": "Test User", "password": "password123"}
    ]
    for u in default_users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            print(f"Creating default demo user: {u['email']}")
            db_user = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=get_password_hash(u["password"]),
                is_active=True,
                role="admin"
            )
            db.add(db_user)
            db.commit()
            print(f"User {u['email']} created successfully.")

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
            ("time", "ALTER TABLE transactions ADD COLUMN time VARCHAR;"),
            ("debit_amount", "ALTER TABLE transactions ADD COLUMN debit_amount FLOAT;"),
            ("credit_amount", "ALTER TABLE transactions ADD COLUMN credit_amount FLOAT;"),
            ("post_date", "ALTER TABLE transactions ADD COLUMN post_date VARCHAR;"),
            ("subcategory", "ALTER TABLE transactions ADD COLUMN subcategory VARCHAR DEFAULT 'Uncategorized';")
        ]
        
        for col_name, sql in migrations:
            if col_name not in columns:
                print(f"Migrating: Adding {col_name} column to transactions table...")
                db.execute(text(sql))
                db.commit()
                print(f"{col_name} column added successfully.")
        
        # Check if investments table has columns
        cursor_inv = db.execute(text("PRAGMA table_info(investments);"))
        columns_inv = [row[1] for row in cursor_inv.fetchall()]
        
        inv_migrations = [
            ("symbol", "ALTER TABLE investments ADD COLUMN symbol VARCHAR;"),
            ("exchange", "ALTER TABLE investments ADD COLUMN exchange VARCHAR;"),
            ("previous_close", "ALTER TABLE investments ADD COLUMN previous_close FLOAT;"),
            ("price_last_updated", "ALTER TABLE investments ADD COLUMN price_last_updated TIMESTAMP;")
        ]
        
        for col_name, sql in inv_migrations:
            if col_name not in columns_inv:
                print(f"Migrating: Adding {col_name} column to investments table...")
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
