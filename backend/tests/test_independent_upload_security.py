import os
import time
import pytest
from fastapi.testclient import TestClient
from app.core.config import settings
from app.core.security import decode_access_token
from app.services.storage import storage_service, generate_signed_url, temp_file_for_processing

def test_upload_security_two_users_real_files(client: TestClient):
    """
    Independent audit verification:
    - Creates two real distinct users: User A and User B.
    - Uploads real distinct files on disk for both.
    - Proves User A cannot access User B's files.
    - Proves unauthenticated requests are rejected.
    """
    # 1. Register User A
    res_a = client.post(
        "/api/v1/auth/register",
        json={"email": "alice_audit@example.com", "password": "AlicePassword@2026", "full_name": "Alice Audit"}
    )
    assert res_a.status_code == 201
    user_a_id = res_a.json()["id"]
    login_a = client.post("/api/v1/auth/login", data={"username": "alice_audit@example.com", "password": "AlicePassword@2026"}).json()
    token_a = login_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User B
    res_b = client.post(
        "/api/v1/auth/register",
        json={"email": "bob_audit@example.com", "password": "BobPassword@2026", "full_name": "Bob Audit"}
    )
    assert res_b.status_code == 201
    user_b_id = res_b.json()["id"]
    login_b = client.post("/api/v1/auth/login", data={"username": "bob_audit@example.com", "password": "BobPassword@2026"}).json()
    token_b = login_b["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Create real physical files on disk under users/{user_id}/receipts/
    key_a = f"users/{user_a_id}/receipts/alice_confidential_bill.pdf"
    key_b = f"users/{user_b_id}/receipts/bob_confidential_bill.pdf"
    
    storage_service.upload_file(b"CONFIDENTIAL ALICE STATEMENT DATA", key_a)
    storage_service.upload_file(b"CONFIDENTIAL BOB STATEMENT DATA", key_b)

    # 4. User A accesses their own file -> SUCCESS
    resp_a_own = client.get(f"/uploads/{key_a}", headers=headers_a)
    assert resp_a_own.status_code == 200
    assert resp_a_own.content == b"CONFIDENTIAL ALICE STATEMENT DATA"

    # 5. User B attempts to access User A's file -> FORBIDDEN (403)
    resp_b_cross = client.get(f"/uploads/{key_a}", headers=headers_b)
    assert resp_b_cross.status_code == 403
    assert "Forbidden" in resp_b_cross.json()["detail"]

    # 6. Unauthenticated request -> UNAUTHORIZED (401)
    resp_anon = client.get(f"/uploads/{key_a}")
    assert resp_anon.status_code == 401
    assert "Authentication required" in resp_anon.json()["detail"]

    # Clean up created files
    storage_service.delete_file(key_a)
    storage_service.delete_file(key_b)

def test_legacy_upload_paths_cannot_bypass_authentication(client: TestClient):
    """
    Verify legacy upload paths (e.g. /uploads/receipts/legacy.pdf) cannot be accessed
    without authentication or by unauthorized users.
    """
    # Create a legacy file
    legacy_key = "receipts/legacy_sensitive_receipt.pdf"
    storage_service.upload_file(b"LEGACY SENSITIVE RECEIPT", legacy_key)

    # Unauthenticated attempt -> 401
    anon_resp = client.get(f"/uploads/{legacy_key}")
    assert anon_resp.status_code == 401

    # Regular authenticated user attempt -> 403 Forbidden (restricted legacy path)
    client.post(
        "/api/v1/auth/register",
        json={"email": "charlie@example.com", "password": "CharliePassword@123", "full_name": "Charlie"}
    )
    login_res = client.post("/api/v1/auth/login", data={"username": "charlie@example.com", "password": "CharliePassword@123"}).json()
    token = login_res["access_token"]
    
    user_resp = client.get(f"/uploads/{legacy_key}", headers={"Authorization": f"Bearer {token}"})
    assert user_resp.status_code == 403

    storage_service.delete_file(legacy_key)

def test_signed_urls_expiration_and_tampering(client: TestClient):
    """
    Verify signed URLs allow authenticated access, expire accurately, and reject tampered signatures.
    """
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={"email": "signed_user@example.com", "password": "SignedUser@2026", "full_name": "Signed User"}
    )
    login_res = client.post("/api/v1/auth/login", data={"username": "signed_user@example.com", "password": "SignedUser@2026"}).json()
    uid = int(decode_access_token(login_res["access_token"]))

    key = f"users/{uid}/receipts/signed_doc.pdf"
    storage_service.upload_file(b"SIGNED DOCUMENT CONTENT", key)

    # 1. Valid signed URL with 60 second expiration
    valid_signed_url = generate_signed_url(key, uid, expires_in=60)
    res_valid = client.get(valid_signed_url)
    assert res_valid.status_code == 200
    assert res_valid.content == b"SIGNED DOCUMENT CONTENT"

    # 2. Expired signed URL (expires_in = -10 seconds)
    expired_signed_url = generate_signed_url(key, uid, expires_in=-10)
    res_expired = client.get(expired_signed_url)
    assert res_expired.status_code == 401
    assert "expired" in res_expired.json()["detail"].lower()

    # 3. Tampered signed URL (modifying uid or signature)
    tampered_url = valid_signed_url + "tampered"
    res_tampered = client.get(tampered_url)
    assert res_tampered.status_code == 401
    assert "invalid signature" in res_tampered.json()["detail"].lower()

    storage_service.delete_file(key)

def test_temporary_processing_files_are_cleaned_up():
    """
    Verify that temporary files downloaded for OCR/processing are guaranteed
    to be cleaned up on disk upon context exit.
    """
    test_key = "users/1/temp_test/test_doc.pdf"
    storage_service.upload_file(b"TEMPORARY PDF DATA FOR OCR", test_key)

    temp_path_captured = None
    with temp_file_for_processing(storage_service, test_key, suffix=".pdf") as tmp_path:
        temp_path_captured = tmp_path
        # File must exist inside context
        assert os.path.exists(tmp_path)
        with open(tmp_path, "rb") as f:
            assert f.read() == b"TEMPORARY PDF DATA FOR OCR"

    # Upon exit, temporary file MUST be deleted
    assert not os.path.exists(temp_path_captured)
    storage_service.delete_file(test_key)
