import pytest
from datetime import datetime, timedelta

def test_savings_goals_with_transactions(client):
    # Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "savings@example.com", "password": "testpassword", "full_name": "Savings User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "savings@example.com", "password": "testpassword"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a category
    cat_res = client.post(
        "/api/v1/transactions/categories/all?name=Salary&type=income",
        headers=headers
    )
    assert cat_res.status_code == 200
    income_cat_id = cat_res.json()["id"]

    # 2. Add an income transaction
    client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "amount": 50000.0,
            "date": "2026-07-01T10:00:00+05:30",
            "description": "Monthly Salary",
            "category_id": income_cat_id,
            "payment_method": "Net Banking",
            "type": "income",
            "is_recurring": False
        }
    )

    # 3. Create a savings goal
    target_date = datetime.now() + timedelta(days=120)
    goal_res = client.post(
        "/api/v1/savings",
        headers=headers,
        json={
            "name": "Emergency Fund",
            "target_amount": 100000.0,
            "current_amount": 20000.0,
            "target_date": target_date.strftime("%Y-%m-%d")
        }
    )
    assert goal_res.status_code == 201

    # 4. Fetch savings goals (this was crashing when transactions exist!)
    fetch_res = client.get("/api/v1/savings", headers=headers)
    assert fetch_res.status_code == 200
    goals = fetch_res.json()
    assert len(goals) == 1
    assert "ai_prediction" in goals[0]
    print("AI Prediction:", goals[0]["ai_prediction"])
