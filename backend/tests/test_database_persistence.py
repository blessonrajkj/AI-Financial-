import pytest
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from app.core.database import engine, get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.core.security import get_password_hash

def test_real_database_persistence_across_sessions():
    """
    Test real database persistence:
    1. Create user in session A
    2. Insert transaction in session A
    3. Commit & close session A
    4. Open session B
    5. Retrieve user & transaction in session B
    6. Verify exact persistence without in-memory state
    """
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # 1. Session A
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

    # 2. Insert transaction
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

    # 3. Close Session A completely
    session_a.close()

    # 4. Open fresh Session B
    session_b = TestSessionLocal()

    # 5. Query user & transaction from database in Session B
    retrieved_user = session_b.query(User).filter(User.id == user_id).first()
    assert retrieved_user is not None
    assert retrieved_user.email == unique_email

    retrieved_tx = session_b.query(Transaction).filter(Transaction.id == tx_id).first()
    assert retrieved_tx is not None
    assert float(retrieved_tx.amount) == 12500.75
    assert retrieved_tx.description == "Persistent Hardware Purchase"

    # Cleanup Session B
    session_b.delete(retrieved_tx)
    session_b.delete(retrieved_user)
    session_b.commit()
    session_b.close()
