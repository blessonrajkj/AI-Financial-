from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import Base, engine, SessionLocal
from app.models import (  # noqa: F401
    User,
    UserProfile,
    LinkedBank,
    UserSettings,
    Transaction,
    Account,
    Transfer,
    Liability,
    Category,
    Merchant,
    Budget,
    Receipt,
    Subscription,
    Notification,
    Investment,
    InvestmentTransaction,
    IndiaPostInvestment,
    IndiaPostRate,
    SavingsGoal,
    ChatHistory,
    VoiceLog,
    ImportBatch,
    AuditLog,
    CategoryFeedback,
)


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
    existing_cats = {c.name.lower(): c for c in db.query(Category).all()}
    for cat in DEFAULT_CATEGORIES:
        cat_key = cat["name"].lower()
        if cat_key not in existing_cats:
            db_cat = Category(name=cat["name"], type=cat["type"], user_id=None)
            db.add(db_cat)
    db.commit()

    from app.core.security import get_password_hash
    default_users = [
        {"email": "demo@pariview.com", "full_name": "Demo User", "password": "Password123!"},
        {"email": "test@example.com", "full_name": "Test User", "password": "Password123!"}
    ]
    for u in default_users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            db_user = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=get_password_hash(u["password"]),
                is_active=True,
                role="admin"
            )
            db.add(db_user)
            db.commit()

def create_tables():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")
    
    db = SessionLocal()
    try:
        dialect_name = engine.dialect.name
        if dialect_name == "postgresql":
            col_cursor = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='transactions';"))
            columns = [row[0] for row in col_cursor.fetchall()]
        else:
            col_cursor = db.execute(text("PRAGMA table_info(transactions);"))
            columns = [row[1] for row in col_cursor.fetchall()]

        migrations = [
            ("import_batch_id", "ALTER TABLE transactions ADD COLUMN import_batch_id VARCHAR;"),
            ("transaction_id", "ALTER TABLE transactions ADD COLUMN transaction_id VARCHAR;"),
            ("reference_number", "ALTER TABLE transactions ADD COLUMN reference_number VARCHAR;"),
            ("bank", "ALTER TABLE transactions ADD COLUMN bank VARCHAR;"),
            ("balance", "ALTER TABLE transactions ADD COLUMN balance NUMERIC(14,2);"),
            ("time", "ALTER TABLE transactions ADD COLUMN time VARCHAR;"),
            ("debit_amount", "ALTER TABLE transactions ADD COLUMN debit_amount NUMERIC(12,2);"),
            ("credit_amount", "ALTER TABLE transactions ADD COLUMN credit_amount NUMERIC(12,2);"),
            ("post_date", "ALTER TABLE transactions ADD COLUMN post_date VARCHAR;"),
            ("subcategory", "ALTER TABLE transactions ADD COLUMN subcategory VARCHAR DEFAULT 'Uncategorized';"),
            ("account_id", "ALTER TABLE transactions ADD COLUMN account_id INTEGER;"),
            ("transfer_id", "ALTER TABLE transactions ADD COLUMN transfer_id INTEGER;"),
            ("fingerprint", "ALTER TABLE transactions ADD COLUMN fingerprint VARCHAR(64);"),
        ]

        for col_name, sql in migrations:
            if col_name not in columns:
                try:
                    db.execute(text(sql))
                    db.commit()
                except Exception:
                    db.rollback()

        if dialect_name == "postgresql":
            col_inv = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='investments';"))
            columns_inv = [row[0] for row in col_inv.fetchall()]
        else:
            col_inv = db.execute(text("PRAGMA table_info(investments);"))
            columns_inv = [row[1] for row in col_inv.fetchall()]

        inv_migrations = [
            ("symbol", "ALTER TABLE investments ADD COLUMN symbol VARCHAR;"),
            ("exchange", "ALTER TABLE investments ADD COLUMN exchange VARCHAR;"),
            ("previous_close", "ALTER TABLE investments ADD COLUMN previous_close NUMERIC(14,4);"),
            ("price_last_updated", "ALTER TABLE investments ADD COLUMN price_last_updated TIMESTAMP;")
        ]

        for col_name, sql in inv_migrations:
            if col_name not in columns_inv:
                try:
                    db.execute(text(sql))
                    db.commit()
                except Exception:
                    db.rollback()

        if dialect_name == "postgresql":
            col_tr = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='transfers';"))
            columns_tr = [row[0] for row in col_tr.fetchall()]
        else:
            col_tr = db.execute(text("PRAGMA table_info(transfers);"))
            columns_tr = [row[1] for row in col_tr.fetchall()]

        tr_migrations = [
            ("fee", "ALTER TABLE transfers ADD COLUMN fee NUMERIC(12,2) DEFAULT 0.00;")
        ]

        for col_name, sql in tr_migrations:
            if col_name not in columns_tr:
                try:
                    db.execute(text(sql))
                    db.commit()
                except Exception:
                    db.rollback()

        init_db(db)
    except Exception as e:
        print(f"Error during db table creation/migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
