import pytest
import io
from decimal import Decimal
from datetime import datetime
from app.models.category_merchant import Category
from app.models.profile import LinkedBank
from app.models.user import User
from app.core import security


def test_budget_category_ownership_validation(client, normal_user_token_headers, db):
    # Category owned by user 2
    foreign_cat = Category(user_id=2, name="Private Cat of User 2", type="expense")
    db.add(foreign_cat)
    db.commit()
    db.refresh(foreign_cat)

    now = datetime.now()
    # User 1 attempts to create a budget on User 2's category -> HTTP 400
    res = client.post(
        "/api/v1/budgets",
        headers=normal_user_token_headers,
        json={
            "category_id": foreign_cat.id,
            "amount": 5000.0,
            "month": now.month,
            "year": now.year
        }
    )
    assert res.status_code == 400
    assert "Category does not belong to the current user" in res.json()["detail"]


def test_account_deletion_requires_password(client, normal_user_token_headers, db):
    # Attempting deletion with wrong password -> HTTP 400
    res = client.request(
        "DELETE",
        "/api/v1/profile",
        headers=normal_user_token_headers,
        json={"password": "wrongpassword"}
    )
    assert res.status_code == 400
    assert "Incorrect password" in res.json()["detail"]


def test_bank_account_masking_and_primary_toggle(client, normal_user_token_headers, db):
    # Link a bank
    res = client.post(
        "/api/v1/banks/link",
        headers=normal_user_token_headers,
        json={
            "bank_name": "HDFC",
            "account_holder": "Test User",
            "account_number": "123456789012",
            "ifsc_code": "HDFC0001234",
            "branch": "Main Branch",
            "account_type": "Savings",
            "nickname": "My HDFC",
            "is_primary": True
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["account_number"] == "••••9012"
    bank1_id = data["id"]

    # Link second bank with is_primary=True
    res2 = client.post(
        "/api/v1/banks/link",
        headers=normal_user_token_headers,
        json={
            "bank_name": "ICICI",
            "account_holder": "Test User",
            "account_number": "987654321098",
            "ifsc_code": "ICIC0001234",
            "branch": "City Branch",
            "account_type": "Current",
            "nickname": "My ICICI",
            "is_primary": True
        }
    )
    assert res2.status_code == 200
    assert res2.json()["account_number"] == "••••1098"
    bank2_id = res2.json()["id"]

    # Verify bank1 is no longer primary
    db_bank1 = db.query(LinkedBank).filter(LinkedBank.id == bank1_id).first()
    assert db_bank1.is_primary is False

    # Check export profile masks bank accounts
    exp_res = client.get("/api/v1/profile/export", headers=normal_user_token_headers)
    assert exp_res.status_code == 200
    exported_banks = exp_res.json()["linked_banks"]
    for b in exported_banks:
        assert b["account_number"].startswith("••••")


def test_update_me_normalizes_email(client, normal_user_token_headers, db):
    res = client.put(
        "/api/v1/auth/me",
        headers=normal_user_token_headers,
        json={"email": "  USER_NORMALIZED@EXAMPLE.COM  "}
    )
    assert res.status_code == 200
    assert res.json()["email"] == "user_normalized@example.com"


def test_avatar_upload_size_and_magic_bytes(client, normal_user_token_headers):
    # Fake content with .jpg extension but invalid magic bytes -> HTTP 400
    fake_file = io.BytesIO(b"this is plain text pretending to be jpg")
    res = client.post(
        "/api/v1/auth/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("test.jpg", fake_file, "image/jpeg")}
    )
    assert res.status_code == 400
    assert "Unsupported image type" in res.json()["detail"]

    # Over 2MB -> HTTP 400
    large_file = io.BytesIO(b"\xff\xd8\xff" + b"0" * (2 * 1024 * 1024 + 10))
    res2 = client.post(
        "/api/v1/auth/me/avatar",
        headers=normal_user_token_headers,
        files={"file": ("large.jpg", large_file, "image/jpeg")}
    )
    assert res2.status_code == 400
    assert "2MB" in res2.json()["detail"]


def test_upload_statement_size_limit(client, normal_user_token_headers):
    # Statement over 10MB -> HTTP 400
    huge_file = io.BytesIO(b"%PDF" + b"0" * (10 * 1024 * 1024 + 50))
    res = client.post(
        "/api/v1/transactions/upload-parse",
        headers=normal_user_token_headers,
        files={"file": ("huge_statement.pdf", huge_file, "application/pdf")}
    )
    assert res.status_code == 400
    assert "10MB" in res.json()["detail"]
