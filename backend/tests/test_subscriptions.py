def test_subscriptions_api(client):
    # Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "subuser@example.com", "password": "testpassword", "full_name": "Sub User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "subuser@example.com", "password": "testpassword"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get subscriptions (empty state)
    res = client.get("/api/v1/subscriptions", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert data["summary"]["active_subscriptions_count"] == 0

    # 2. Create subscription
    sub_res = client.post(
        "/api/v1/subscriptions",
        headers=headers,
        json={
            "name": "Netflix Premium",
            "amount": 649.0,
            "billing_cycle": "monthly",
            "next_billing_date": "2026-10-15T00:00:00",
            "is_active": True,
            "is_autopay": True
        }
    )
    assert sub_res.status_code in [200, 201]
    sub_id = sub_res.json()["id"]

    # 3. Get subscriptions (populated state)
    res2 = client.get("/api/v1/subscriptions", headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["summary"]["active_subscriptions_count"] == 1
    assert data2["summary"]["monthly_cost"] == 649.0
    assert len(data2["items"]) == 1
    assert data2["items"][0]["name"] == "Netflix Premium"

    # 4. Update subscription
    upd_res = client.put(
        f"/api/v1/subscriptions/{sub_id}",
        headers=headers,
        json={"amount": 799.0}
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["amount"] == 799.0

    # 5. Delete subscription
    del_res = client.delete(f"/api/v1/subscriptions/{sub_id}", headers=headers)
    assert del_res.status_code == 200
