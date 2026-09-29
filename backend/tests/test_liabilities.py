import pytest
from fastapi.testclient import TestClient

def test_liabilities_crud_and_summary(client: TestClient, normal_user_token_headers: dict):
    # 1. Create liability
    res = client.post(
        "/api/v1/liabilities/",
        headers=normal_user_token_headers,
        json={
            "name": "HDFC Credit Card",
            "liability_type": "Credit Card",
            "total_amount": 100000.00,
            "remaining_amount": 25000.00,
            "interest_rate": 18.5,
            "minimum_payment": 2500.00,
            "status": "Active"
        }
    )
    assert res.status_code == 201
    liability_id = res.json()["id"]

    # 2. Get summary
    summary_res = client.get("/api/v1/liabilities/summary", headers=normal_user_token_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_active_liabilities"] >= 1
    assert summary["total_remaining_balance"] >= 25000.0

    # 3. Clean up
    client.delete(f"/api/v1/liabilities/{liability_id}", headers=normal_user_token_headers)
