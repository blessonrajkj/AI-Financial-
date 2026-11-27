import time
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch
from app.main import app
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category_merchant import Category
from app.core.security import create_access_token, get_password_hash
from app.core.database import get_db
from fastapi.testclient import TestClient

@pytest.fixture
def perf_data(db):
    user = User(
        email=f"perf_user_{time.time()}@example.com",
        hashed_password=get_password_hash("perfpass123"),
        full_name="Performance Test User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    cat = Category(name="Food & Dining", user_id=user.id)
    db.add(cat)
    db.commit()
    db.refresh(cat)

    now = datetime.now()
    tx_list = []
    for i in range(1050):
        tx_list.append(Transaction(
            user_id=user.id,
            amount=Decimal(str(10 + (i % 100))),
            type="expense" if i % 4 != 0 else "income",
            category_id=cat.id,
            date=now - timedelta(days=(i % 30)),
            description=f"Transaction {i}"
        ))
    db.bulk_save_objects(tx_list)
    db.commit()

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers

@pytest.fixture
def empty_user_data(db):
    user = User(
        email=f"empty_user_{time.time()}@example.com",
        hashed_password=get_password_hash("emptypass123"),
        full_name="Empty User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers

def test_dashboard_with_1000_plus_transactions_performance(client, perf_data):
    """
    Performance Verification:
    Target: Under 2 seconds on local development for user with 1,000+ transactions.
    """
    _, headers = perf_data

    # Warm-up auth check
    client.get("/api/v1/auth/me", headers=headers)

    # 1. Measure /auth/me
    t0 = time.perf_counter()
    res_auth = client.get("/api/v1/auth/me", headers=headers)
    t_auth = (time.perf_counter() - t0) * 1000
    assert res_auth.status_code == 200
    assert t_auth < 100, f"Auth verification took {t_auth:.1f}ms, target < 100ms"

    # 2. Measure /analytics/summary (KPI values + Recent Activity)
    t0 = time.perf_counter()
    res_summary = client.get("/api/v1/analytics/summary", headers=headers)
    t_summary = (time.perf_counter() - t0) * 1000
    assert res_summary.status_code == 200
    data_summary = res_summary.json()
    assert "current_balance" in data_summary
    assert "monthly_income" in data_summary
    assert "monthly_spending" in data_summary
    assert "budget_remaining" in data_summary
    assert "recent_transactions" in data_summary
    assert t_summary < 1000, f"Dashboard summary took {t_summary:.1f}ms, target < 1000ms"

    # 3. Measure /analytics/trends?days=30 (Cash Flow)
    t0 = time.perf_counter()
    res_trends = client.get("/api/v1/analytics/trends?days=30", headers=headers)
    t_trends = (time.perf_counter() - t0) * 1000
    assert res_trends.status_code == 200
    data_trends = res_trends.json()
    assert "daily_spending" in data_trends
    assert t_trends < 500, f"Trends took {t_trends:.1f}ms, target < 500ms"

    # 4. Measure /analytics/dashboard/ai-summary
    t0 = time.perf_counter()
    res_ai = client.get("/api/v1/analytics/dashboard/ai-summary", headers=headers)
    t_ai = (time.perf_counter() - t0) * 1000
    assert res_ai.status_code == 200
    data_ai = res_ai.json()
    assert "insights" in data_ai
    assert t_ai < 500, f"AI summary took {t_ai:.1f}ms, target < 500ms"

    # Combined total data loading latency
    total_data_time = t_summary + t_trends + t_ai
    print(f"\n[1,000+ Transactions Benchmark] Auth: {t_auth:.1f}ms | Summary (KPIs): {t_summary:.1f}ms | Trends: {t_trends:.1f}ms | AI: {t_ai:.1f}ms | Total sequential: {total_data_time:.1f}ms")
    assert total_data_time < 2000, f"Total sequential data loading took {total_data_time:.1f}ms, target < 2000ms"

def test_dashboard_with_empty_account(client, empty_user_data):
    """
    Performance Verification: Empty account with 0 transactions.
    Should return instantly with clean zero/empty state, without errors or hanging.
    """
    _, headers = empty_user_data

    # Warm-up call
    client.get("/api/v1/auth/me", headers=headers)

    t0 = time.perf_counter()
    res_summary = client.get("/api/v1/analytics/summary", headers=headers)
    t_summary = (time.perf_counter() - t0) * 1000
    assert res_summary.status_code == 200
    data = res_summary.json()
    assert data["monthly_spending"] == 0.0
    assert data["monthly_income"] == 0.0
    assert data["recent_transactions"] == []
    assert t_summary < 500, f"Empty account summary took {t_summary:.1f}ms, target < 500ms"

    t0 = time.perf_counter()
    res_trends = client.get("/api/v1/analytics/trends?days=30", headers=headers)
    t_trends = (time.perf_counter() - t0) * 1000
    assert res_trends.status_code == 200
    assert t_trends < 300

    t0 = time.perf_counter()
    res_ai = client.get("/api/v1/analytics/dashboard/ai-summary", headers=headers)
    t_ai = (time.perf_counter() - t0) * 1000
    assert res_ai.status_code == 200
    assert res_ai.json()["insights"] == []
    assert t_ai < 300

def test_dashboard_when_redis_unavailable_uses_fast_circuit_breaker(client, perf_data):
    """
    Verify that when Redis is unavailable, requests do not stall for 2.5s socket timeouts.
    Circuit breaker returns in < 30ms.
    """
    _, headers = perf_data

    with patch("app.core.redis_client.get_redis_client", return_value=None):
        t0 = time.perf_counter()
        res = client.get("/api/v1/auth/me", headers=headers)
        dt = (time.perf_counter() - t0) * 1000
        assert res.status_code == 200
        assert dt < 50, f"Auth with offline Redis took {dt:.1f}ms, target < 50ms"

        t0 = time.perf_counter()
        res_summary = client.get("/api/v1/analytics/summary", headers=headers)
        dt_sum = (time.perf_counter() - t0) * 1000
        assert res_summary.status_code == 200
        assert dt_sum < 600

def test_database_error_handling_fails_cleanly(perf_data):
    """
    Verify that if the database fails, endpoints return clean 500 without hanging indefinitely.
    """
    _, headers = perf_data
    safe_client = TestClient(app, raise_server_exceptions=False)

    def failing_db():
        raise RuntimeError("PostgreSQL cluster connection lost")

    app.dependency_overrides[get_db] = failing_db
    try:
        t0 = time.perf_counter()
        res = safe_client.get("/api/v1/analytics/summary", headers=headers)
        dt = (time.perf_counter() - t0) * 1000
        assert res.status_code == 500
        assert dt < 500, f"Database error response took {dt:.1f}ms"
    finally:
        app.dependency_overrides.pop(get_db, None)
