import pytest
from fastapi.testclient import TestClient

def test_accounts_crud(client: TestClient, normal_user_token_headers: dict):
    # 1. Create account
    response = client.post(
        "/api/v1/accounts/",
        headers=normal_user_token_headers,
        json={
            "account_name": "Salary Savings",
            "bank_name": "State Bank of India",
            "account_type": "Savings",
            "balance": 50000.00,
            "currency": "INR",
            "account_number_mask": "XX4321"
        }
    )
    assert response.status_code == 201
    account_data = response.json()
    assert account_data["account_name"] == "Salary Savings"
    assert float(account_data["balance"]) == 50000.0
    account_id = account_data["id"]

    # 2. Get accounts list
    response = client.get("/api/v1/accounts/", headers=normal_user_token_headers)
    assert response.status_code == 200
    accounts = response.json()
    assert len(accounts) >= 1

    # 3. Get single account
    response = client.get(f"/api/v1/accounts/{account_id}", headers=normal_user_token_headers)
    assert response.status_code == 200

    # 4. Update account
    response = client.put(
        f"/api/v1/accounts/{account_id}",
        headers=normal_user_token_headers,
        json={"account_name": "Primary Salary Account", "balance": 55000.00}
    )
    assert response.status_code == 200
    assert response.json()["account_name"] == "Primary Salary Account"
    assert float(response.json()["balance"]) == 55000.0

    # 5. Delete account
    response = client.delete(f"/api/v1/accounts/{account_id}", headers=normal_user_token_headers)
    assert response.status_code == 204
