import os
import pytest
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.investment import Investment
from app.models.savings_goal import SavingsGoal
from app.models.subscription import Subscription
from app.models.notification import Notification
from app.models.chat_history import ChatHistory
from app.models.import_batch import ImportBatch
from app.models.receipt import Receipt
from app.core.security import get_password_hash

TEST_DB_FILE = "./test_persistence.db"
persist_engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=persist_engine)

def setup_module(module):
    Base.metadata.create_all(bind=persist_engine)

def teardown_module(module):
    persist_engine.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

def test_real_database_persistence_across_sessions():
    """
    Test real database persistence for User & Transaction across closed DB sessions.
    """
    session_a = TestSessionLocal()
    unique_email = f"persist_{datetime.now().timestamp()}@example.com"
    user = User(
        email=unique_email,
        hashed_password=get_password_hash("PersistPass123!"),
        full_name="Persistence User",
        is_active=True
    )
    session_a.add(user)
    session_a.commit()
    session_a.refresh(user)

    user_id = user.id
    assert user_id is not None

    tx = Transaction(
        user_id=user_id,
        amount=12500.75,
        type="expense",
        category_id=None,
        subcategory="Electronics",
        description="Persistent Hardware Purchase",
        date=datetime.now()
    )
    session_a.add(tx)
    session_a.commit()
    session_a.refresh(tx)
    tx_id = tx.id

    # Close Session A
    session_a.close()

    # Open fresh Session B
    session_b = TestSessionLocal()

    retrieved_user = session_b.query(User).filter(User.id == user_id).first()
    assert retrieved_user is not None
    assert retrieved_user.email == unique_email

    retrieved_tx = session_b.query(Transaction).filter(Transaction.id == tx_id).first()
    assert retrieved_tx is not None
    assert float(retrieved_tx.amount) == 12500.75
    assert retrieved_tx.description == "Persistent Hardware Purchase"

    # Cleanup
    session_b.delete(retrieved_user)
    session_b.commit()
    session_b.close()
