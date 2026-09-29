import pytest
from fastapi.testclient import TestClient

def test_transfer_between_accounts(client: TestClient, normal_user_token_headers: dict):
    acc1_res = client.post(
        "/api/v1/accounts/",
        headers=normal_user_token_headers,
        json={"account_name": "Checking", "bank_name": "SBI", "balance": 10000.00}
    )
    acc1_id = acc1_res.json()["id"]

    acc2_res = client.post(
        "/api/v1/accounts/",
        headers=normal_user_token_headers,
        json={"account_name": "Savings", "bank_name": "HDFC", "balance": 2000.00}
    )
    acc2_id = acc2_res.json()["id"]

    transfer_res = client.post(
        "/api/v1/transfers/",
        headers=normal_user_token_headers,
        json={
            "source_account_id": acc1_id,
            "destination_account_id": acc2_id,
            "amount": 3000.00,
            "notes": "Monthly savings allocation"
        }
    )
    assert transfer_res.status_code == 201
    transfer_data = transfer_res.json()
    assert float(transfer_data["amount"]) == 3000.0

    acc1_updated = client.get(f"/api/v1/accounts/{acc1_id}", headers=normal_user_token_headers).json()
    acc2_updated = client.get(f"/api/v1/accounts/{acc2_id}", headers=normal_user_token_headers).json()

    assert float(acc1_updated["balance"]) == 7000.0
    assert float(acc2_updated["balance"]) == 5000.0

    list_res = client.get("/api/v1/transfers/", headers=normal_user_token_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
