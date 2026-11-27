import pytest
from decimal import Decimal
from datetime import datetime
from fastapi.testclient import TestClient
from app.models.user import User
from app.models.account import Account
from app.models.transfer import Transfer
from app.models.transaction import Transaction
from app.models.investment import Investment
from app.models.savings_goal import SavingsGoal
from app.models.voice_log import VoiceLog
from app.models.profile import UserProfile
from app.middleware.rate_limit import determine_tier

def test_rate_limit_tier_auth_me_vs_login():
    assert determine_tier("/api/v1/auth/me") == "api"
    assert determine_tier("/api/v1/auth/login") == "auth"
    assert determine_tier("/api/v1/auth/register") == "auth"
    assert determine_tier("/api/v1/auth/change-password") == "auth"

def test_ai_insights_decimal_calculation(client: TestClient, db, normal_user_token_headers: dict):
    user = db.query(User).filter(User.email == "testuser@example.com").first()
    tx1 = Transaction(
        user_id=user.id,
        amount=Decimal("150.50"),
        date=datetime(2026, 11, 21), # Saturday
        type="expense",
        description="Weekend test"
    )
    tx2 = Transaction(
        user_id=user.id,
        amount=Decimal("100.00"),
        date=datetime(2026, 11, 20), # Friday
        type="expense",
        description="Weekday test"
    )
    db.add_all([tx1, tx2])
    db.commit()

    response = client.get("/api/v1/ai/insights", headers=normal_user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert "insights" in data
    assert "recommendations" in data
    for ins in data["insights"]:
        assert "$" not in ins

def test_voice_entry_confirm_json_body(client: TestClient, db, normal_user_token_headers: dict):
    user = db.query(User).filter(User.email == "testuser@example.com").first()
    log = VoiceLog(
        user_id=user.id,
        transcript="Spent 250 on lunch at Cafe_100%",
        parsed_json="{}"
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    payload = {
        "voice_log_id": log.id,
        "amount": 250.0,
        "merchant_name": "Cafe_100%",
        "category_name": "Dining_Out%",
        "description": "Lunch at Cafe_100%"
    }
    response = client.post("/api/v1/ai/voice-entry/confirm", json=payload, headers=normal_user_token_headers)
    assert response.status_code == 201
    data = response.json()
    assert float(data["amount"]) == 250.0

def test_username_collision_and_duplicate_conflict(client: TestClient, db, normal_user_token_headers: dict):
    user = db.query(User).filter(User.email == "testuser@example.com").first()
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id, username="unique_test_user")
        db.add(profile)
        db.commit()

    # Attempting to update to a duplicate username should return 409
    other_user = User(
        email="other_unique_user@example.com",
        hashed_password="some_hashed_password_123",
        full_name="Other User",
        is_active=True
    )
    db.add(other_user)
    db.commit()
    db.refresh(other_user)

    other_profile = UserProfile(user_id=other_user.id, username="other_taken_name")
    db.add(other_profile)
    db.commit()

    response = client.put(
        "/api/v1/profile",
        json={"username": "other_taken_name"},
        headers=normal_user_token_headers
    )
    assert response.status_code == 409

def test_reports_investment_and_savings_decimal_fix(client: TestClient, db, normal_user_token_headers: dict):
    user = db.query(User).filter(User.email == "testuser@example.com").first()
    inv = Investment(
        user_id=user.id,
        asset_name="Test Stock",
        asset_type="Stocks",
        symbol="TEST.NS",
        quantity=Decimal("10.00"),
        purchase_price=Decimal("100.00"),
        current_price=Decimal("120.00"),
        purchase_date=datetime(2026, 1, 1),
        dividends_received=Decimal("50.00")
    )
    goal = SavingsGoal(
        user_id=user.id,
        name="Emergency Fund",
        target_amount=Decimal("10000.00"),
        current_amount=Decimal("2500.00"),
        target_date=datetime(2026, 12, 31)
    )
    db.add_all([inv, goal])
    db.commit()

    # Investment report
    res_inv = client.get("/api/v1/analytics/reports/generate?report_type=investment&period=2026-11", headers=normal_user_token_headers)
    assert res_inv.status_code == 200
    data_inv = res_inv.json()
    assert "summary" in data_inv

    # Savings report
    res_sav = client.get("/api/v1/analytics/reports/generate?report_type=savings&period=2026-11", headers=normal_user_token_headers)
    assert res_sav.status_code == 200
    data_sav = res_sav.json()
    assert "summary" in data_sav

def test_budget_month_validation_and_invalid_period(client: TestClient, db, normal_user_token_headers: dict):
    # Invalid month in budget create (month 13)
    res_bad_budget = client.post(
        "/api/v1/budgets",
        json={"category_id": 1, "amount": 1000, "month": 13, "year": 2026},
        headers=normal_user_token_headers
    )
    assert res_bad_budget.status_code == 422

    # Invalid period in reports ("all")
    res_bad_period = client.get(
        "/api/v1/analytics/reports/generate?report_type=monthly&period=all",
        headers=normal_user_token_headers
    )
    assert res_bad_period.status_code == 400

def test_cannot_delete_account_with_transfers(client: TestClient, db, normal_user_token_headers: dict):
    user = db.query(User).filter(User.email == "testuser@example.com").first()
    acc1 = Account(
        user_id=user.id,
        account_name="Savings Account",
        bank_name="SBI",
        balance=Decimal("5000.00")
    )
    acc2 = Account(
        user_id=user.id,
        account_name="Checking Account",
        bank_name="HDFC",
        balance=Decimal("2000.00")
    )
    db.add_all([acc1, acc2])
    db.commit()
    db.refresh(acc1)
    db.refresh(acc2)

    transfer = Transfer(
        user_id=user.id,
        source_account_id=acc1.id,
        destination_account_id=acc2.id,
        amount=Decimal("500.00"),
        transfer_date=datetime.now(),
        fee=Decimal("0.00")
    )
    db.add(transfer)
    db.commit()

    # Attempting to delete acc1 should return 409
    res = client.delete(f"/api/v1/accounts/{acc1.id}", headers=normal_user_token_headers)
    assert res.status_code == 409
    assert "transfers" in res.json()["detail"].lower()

def test_chatbot_fallback_when_api_key_missing(client: TestClient, normal_user_token_headers: dict):
    res = client.post(
        "/api/v1/ai/chat",
        json={"query": "How much did I spend?"},
        headers=normal_user_token_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "response" in data
    assert len(data["response"]) > 0
