import pytest
from datetime import datetime

def test_bulk_validate_and_import(client):
    # 1. Register & Login
    client.post(
        "/api/v1/auth/register",
        json={"email": "excel@example.com", "password": "testpassword", "full_name": "Excel User"}
    )
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "excel@example.com", "password": "testpassword"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Call bulk validate on a normal transaction
    validate_payload = {
        "transactions": [
            {
                "date": "2026-07-11T12:00:00",
                "amount": 1835.00,
                "type": "expense",
                "merchant": "Zomato Dineout",
                "category": "Food",
                "description": "Zomato dining expense",
                "payment_method": "Card"
            },
            {
                "date": "2026-07-11T12:05:00",
                "amount": 5000.00,
                "type": "income",
                "merchant": "Employer Payroll",
                "category": "Salary",
                "description": "Monthly pay check",
                "payment_method": "Net Banking"
            }
        ]
    }

    val_res = client.post(
        "/api/v1/transactions/bulk-validate",
        headers=headers,
        json=validate_payload
    )
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["summary"]["total"] == 2
    assert val_data["summary"]["valid"] == 2
    assert val_data["summary"]["duplicates"] == 0
    assert val_data["summary"]["errors"] == 0
    
    # Check that individual rows are valid and not duplicates
    assert val_data["validation_results"][0]["is_valid"] is True
    assert val_data["validation_results"][0]["is_duplicate"] is False

    # 3. Import the transactions using bulk-import
    import_payload = {
        "transactions": validate_payload["transactions"],
        "duplicate_strategy": "skip"
    }
    
    import_res = client.post(
        "/api/v1/transactions/bulk-import",
        headers=headers,
        json=import_payload
    )
    assert import_res.status_code == 200
    import_data = import_res.json()
    assert import_data["imported"] == 2
    assert import_data["skipped"] == 0
    assert import_data["duplicates"] == 0

    # 4. Re-run validate with same payload to verify duplicate detection
    val_res2 = client.post(
        "/api/v1/transactions/bulk-validate",
        headers=headers,
        json=validate_payload
    )
    assert val_res2.status_code == 200
    val_data2 = val_res2.json()
    assert val_data2["summary"]["duplicates"] == 2
    assert val_data2["validation_results"][0]["is_duplicate"] is True
    assert val_data2["validation_results"][1]["is_duplicate"] is True

    # 5. Check duplicate strategy: "skip"
    import_payload_skip = {
        "transactions": validate_payload["transactions"],
        "duplicate_strategy": "skip"
    }
    import_res_skip = client.post(
        "/api/v1/transactions/bulk-import",
        headers=headers,
        json=import_payload_skip
    )
    assert import_res_skip.status_code == 200
    assert import_res_skip.json()["imported"] == 0
    assert import_res_skip.json()["skipped"] == 2
    assert import_res_skip.json()["duplicates"] == 2

    # 6. Check duplicate strategy: "keep"
    import_payload_keep = {
        "transactions": validate_payload["transactions"],
        "duplicate_strategy": "keep"
    }
    import_res_keep = client.post(
        "/api/v1/transactions/bulk-import",
        headers=headers,
        json=import_payload_keep
    )
    assert import_res_keep.status_code == 200
    assert import_res_keep.json()["imported"] == 2
    assert import_res_keep.json()["skipped"] == 0
    assert import_res_keep.json()["duplicates"] == 2

    # 7. Check duplicate strategy: "replace"
    import_payload_replace = {
        "transactions": [
            {
                "date": "2026-07-11T12:00:00",
                "amount": 1835.00,
                "type": "expense",
                "merchant": "Zomato Dineout",
                "category": "Food",
                "description": "Zomato dining expense replaced",
                "payment_method": "Card"
            }
        ],
        "duplicate_strategy": "replace"
    }
    import_res_replace = client.post(
        "/api/v1/transactions/bulk-import",
        headers=headers,
        json=import_payload_replace
    )
    assert import_res_replace.status_code == 200
    assert import_res_replace.json()["imported"] == 1
    assert import_res_replace.json()["duplicates"] == 1
