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
    
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
