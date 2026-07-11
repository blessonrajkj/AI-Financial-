import pytest

def test_bulk_delete_transactions(client):
    # 1. Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "bulkdelete@example.com", "password": "testpassword", "full_name": "Bulk User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "bulkdelete@example.com", "password": "testpassword"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add two transactions
    t1 = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={"amount": 1500.0, "type": "expense", "date": "2026-07-11T12:00:00", "description": "T1", "payment_method": "Cash"}
    ).json()
    t2 = client.post(
        "/api/v1/transactions",
        headers=headers,
        json={"amount": 2500.0, "type": "income", "date": "2026-07-11T12:00:00", "description": "T2", "payment_method": "Card"}
    ).json()

    # 3. Call bulk-delete
    payload = {"ids": [t1["id"], t2["id"]]}
    del_res = client.post("/api/v1/transactions/bulk-delete", headers=headers, json=payload)
    assert del_res.status_code == 200
    assert del_res.json()["deleted_count"] == 2

    # 4. Verify they are gone
    list_res = client.get("/api/v1/transactions", headers=headers)
    assert len(list_res.json()) == 0
