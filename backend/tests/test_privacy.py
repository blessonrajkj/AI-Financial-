import pytest
from fastapi.testclient import TestClient

def test_user_data_export(client: TestClient, normal_user_token_headers: dict):
    res = client.get("/api/v1/user/export-data", headers=normal_user_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert "user_profile" in data
    assert "transactions" in data
    assert "accounts" in data
    assert "liabilities" in data
