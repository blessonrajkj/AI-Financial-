import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.investment import Investment
from app.models.category_merchant import Category
from app.core.security import get_password_hash, create_access_token

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"

def test_user_data_isolation(db_session):
    client = TestClient(app)

    # 1. Ensure user A and user B exist in database
    user_a = db_session.query(User).filter(User.email == "user_a_test@pariview.com").first()
    if not user_a:
        user_a = User(email="user_a_test@pariview.com", hashed_password=get_password_hash("pass123"), full_name="User A")
        db_session.add(user_a)

    user_b = db_session.query(User).filter(User.email == "user_b_test@pariview.com").first()
    if not user_b:
        user_b = User(email="user_b_test@pariview.com", hashed_password=get_password_hash("pass123"), full_name="User B")
        db_session.add(user_b)

    db_session.commit()
    db_session.refresh(user_a)
    db_session.refresh(user_b)

    # Add a private transaction for User A
    tx_a = Transaction(user_id=user_a.id, amount=500.0, description="User A Secret Expense", type="expense")
    db_session.add(tx_a)
    db_session.commit()

    # Generate token for User B (sub must be string of user_id)
    token_b = create_access_token(subject=str(user_b.id))


    # User B requests transactions list
    response = client.get("/api/v1/transactions", headers={"Authorization": f"Bearer {token_b}"})
    assert response.status_code == 200
    data = response.json()
    
    # Verify User B cannot see User A's transaction
    tx_ids = [tx["id"] for tx in data]
    assert tx_a.id not in tx_ids
    for item in data:
        assert item["user_id"] == user_b.id

    # Cleanup test users' extra transactions
    db_session.delete(tx_a)
    db_session.commit()
