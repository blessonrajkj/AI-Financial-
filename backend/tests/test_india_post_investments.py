import pytest
from datetime import datetime, timedelta

def test_india_post_investments_crud(client):
    # 1. Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "indiapost@example.com", "password": "testpassword", "full_name": "Post Office User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "indiapost@example.com", "password": "testpassword"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add an India Post investment (PPF)
    inv_date = datetime.now()
    mat_date = inv_date + timedelta(days=365*15)
    
    payload = {
        "scheme_name": "Public Provident Fund (PPF)",
        "amount": 50000.0,
        "interest_rate": 7.1,
        "investment_date": inv_date.isoformat(),
        "maturity_date": mat_date.isoformat(),
        "frequency": "One Time",
        "nominee": "Spouse",
        "account_number": "1002448",
        "branch_name": "General Post Office",
        "notes": "Tax saving holding",
        "status": "Active"
    }

    create_res = client.post(
        "/api/v1/india-post-investments",
        headers=headers,
        json=payload
    )
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["scheme_name"] == "Public Provident Fund (PPF)"
    assert created["amount"] == 50000.0
    assert created["nominee"] == "Spouse"
    assert created["status"] == "Active"
    inv_id = created["id"]

    # 3. List investments
    list_res = client.get("/api/v1/india-post-investments", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["id"] == inv_id

    # 4. Check summary
    summary_res = client.get("/api/v1/india-post-investments/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["metrics"]["total_invested"] == 50000.0
    assert summary["metrics"]["active_schemes_count"] == 1
    assert len(summary["portfolio_allocation"]) == 1
    assert summary["portfolio_allocation"][0]["name"] == "Public Provident Fund (PPF)"

    # 5. Check AI insights
    insights_res = client.get("/api/v1/india-post-investments/ai-insights", headers=headers)
    assert insights_res.status_code == 200
    insights = insights_res.json()
    assert len(insights["insights"]) > 0
    # PPF limit warnings should trigger since contribution is under 1.5L
    assert any("PPF contribution limit" in ins["message"] for ins in insights["insights"])

    # 6. Update investment (increase amount & change notes)
    update_payload = {
        "amount": 75000.0,
        "notes": "Updated tax saving holding"
    }
    update_res = client.put(
        f"/api/v1/india-post-investments/{inv_id}",
        headers=headers,
        json=update_payload
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["amount"] == 75000.0
    assert updated["notes"] == "Updated tax saving holding"

    # Verify updated summary
    summary_res2 = client.get("/api/v1/india-post-investments/summary", headers=headers)
    assert summary_res2.json()["metrics"]["total_invested"] == 75000.0

    # 7. Delete investment
    del_res = client.delete(f"/api/v1/india-post-investments/{inv_id}", headers=headers)
    assert del_res.status_code == 200
    
    # Verify ledger is now empty
    list_res2 = client.get("/api/v1/india-post-investments", headers=headers)
    assert len(list_res2.json()) == 0
