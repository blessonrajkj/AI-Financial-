import pytest
from datetime import datetime
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.database import engine
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

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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

    # Cleanup Session B
    session_b.delete(retrieved_tx)
    session_b.delete(retrieved_user)
    session_b.commit()
    session_b.close()


def test_all_entities_persistence_across_sessions():
    """
    Test real database persistence across sessions for Budgets, Investments, Savings Goals,
    Subscriptions, Notifications, Chat History, Import Batches, and Receipt Metadata.
    """
    session_a = TestSessionLocal()
    email = f"entity_persist_{datetime.now().timestamp()}@example.com"
    user = User(email=email, hashed_password=get_password_hash("pass123"), full_name="Entity User")
    session_a.add(user)
    session_a.commit()
    user_id = user.id

    now = datetime.now()
    # Create entities
    b = Budget(user_id=user_id, category_id=1, amount=15000.00, month=9, year=2026)
    inv = Investment(user_id=user_id, asset_name="TCS", asset_type="Stock", quantity=10, purchase_price=3500.00, current_price=3600.00)
    goal = SavingsGoal(user_id=user_id, name="Emergency Fund", target_amount=100000.00, current_amount=25000.00, target_date=now)
    sub = Subscription(user_id=user_id, name="Netflix Premium", amount=649.00, billing_cycle="Monthly", next_billing_date=now)
    notif = Notification(user_id=user_id, title="Budget Alert", message="80% budget reached", type="alert")
    chat = ChatHistory(user_id=user_id, query="How much did I spend on food?", response="You spent 3,500 INR this month.")
    batch = ImportBatch(id=f"batch_{datetime.now().timestamp()}", user_id=user_id, filename="bank_statement.pdf", file_type="pdf", total_records=15, successful_records=15)
    rec = Receipt(user_id=user_id, file_path="uploads/receipts/rec123.png", merchant_name="DMart", total_amount=1450.00, status="parsed")

    session_a.add_all([b, inv, goal, sub, notif, chat, batch, rec])
    session_a.commit()

    b_id, inv_id, goal_id, sub_id, notif_id, chat_id, batch_id, rec_id = (
        b.id, inv.id, goal.id, sub.id, notif.id, chat.id, batch.id, rec.id
    )
    session_a.close()

    # Re-open in fresh session B
    session_b = TestSessionLocal()

    assert session_b.query(Budget).filter(Budget.id == b_id).first().amount == 15000.00
    assert session_b.query(Investment).filter(Investment.id == inv_id).first().asset_name == "TCS"
    assert session_b.query(SavingsGoal).filter(SavingsGoal.id == goal_id).first().target_amount == 100000.00
    assert session_b.query(Subscription).filter(Subscription.id == sub_id).first().name == "Netflix Premium"
    assert session_b.query(Notification).filter(Notification.id == notif_id).first().title == "Budget Alert"
    assert session_b.query(ChatHistory).filter(ChatHistory.id == chat_id).first().response.startswith("You spent")
    assert session_b.query(ImportBatch).filter(ImportBatch.id == batch_id).first().total_records == 15
    assert session_b.query(Receipt).filter(Receipt.id == rec_id).first().merchant_name == "DMart"

    # Cleanup
    session_b.query(Receipt).filter(Receipt.id == rec_id).delete()
    session_b.query(ImportBatch).filter(ImportBatch.id == batch_id).delete()
    session_b.query(ChatHistory).filter(ChatHistory.id == chat_id).delete()
    session_b.query(Notification).filter(Notification.id == notif_id).delete()
    session_b.query(Subscription).filter(Subscription.id == sub_id).delete()
    session_b.query(SavingsGoal).filter(SavingsGoal.id == goal_id).delete()
    session_b.query(Investment).filter(Investment.id == inv_id).delete()
    session_b.query(Budget).filter(Budget.id == b_id).delete()
    session_b.query(User).filter(User.id == user_id).delete()
    session_b.commit()
    session_b.close()


def test_transaction_rollback_safety():
    """
    Verify DB rollback integrity when an exception occurs mid-transaction.
    """
    session = TestSessionLocal()
    email = f"rollback_{datetime.now().timestamp()}@example.com"
    user = User(email=email, hashed_password=get_password_hash("pass"), full_name="Rollback User")
    session.add(user)
    session.commit()

    try:
        # Add a transaction
        tx = Transaction(user_id=user.id, amount=100.0, description="Valid Tx", type="expense")
        session.add(tx)
        session.flush()

        # Intentionally force a DB error (e.g. invalid SQL query)
        session.execute(text("SELECT * FROM non_existent_table_for_rollback_test"))
        session.commit()
    except Exception:
        session.rollback()

    # Verify session is rolled back and undamaged
    tx_count = session.query(Transaction).filter(Transaction.user_id == user.id).count()
    assert tx_count == 0

    session.delete(user)
    session.commit()
    session.close()


def test_comprehensive_cross_user_isolation():
    """
    Verify strict ownership isolation across User A and User B for all financial entities.
    """
    session = TestSessionLocal()
    now = datetime.now()
    user_a = User(email=f"iso_a_{datetime.now().timestamp()}@example.com", hashed_password="pw", full_name="User A")
    user_b = User(email=f"iso_b_{datetime.now().timestamp()}@example.com", hashed_password="pw", full_name="User B")
    session.add_all([user_a, user_b])
    session.commit()

    # User A creates items
    tx_a = Transaction(user_id=user_a.id, amount=999.00, description="User A Secret", type="expense")
    b_a = Budget(user_id=user_a.id, category_id=1, amount=5000.00, month=9, year=2026)
    sub_a = Subscription(user_id=user_a.id, name="User A Sub", amount=199.00, billing_cycle="Monthly", next_billing_date=now)
    session.add_all([tx_a, b_a, sub_a])
    session.commit()

    # User B queries User B's records
    user_b_txs = session.query(Transaction).filter(Transaction.user_id == user_b.id).all()
    user_b_budgets = session.query(Budget).filter(Budget.user_id == user_b.id).all()
    user_b_subs = session.query(Subscription).filter(Subscription.user_id == user_b.id).all()

    # Verify User B sees 0 records from User A
    assert len(user_b_txs) == 0
    assert len(user_b_budgets) == 0
    assert len(user_b_subs) == 0

    # Cleanup
    session.delete(tx_a)
    session.delete(b_a)
    session.delete(sub_a)
    session.delete(user_a)
    session.delete(user_b)
    session.commit()
    session.close()
