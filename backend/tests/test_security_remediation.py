import os
import pytest
from fastapi.testclient import TestClient
from app.core.config import Settings
from app.core.security import (
    validate_password_strength,
    create_access_token,
    decode_access_token,
    revoke_user_sessions,
    is_token_revoked
)
from app.middleware.rate_limit import check_rate_limit, _MEM_RATE_LOG

def test_registration_cannot_assign_admin(client: TestClient):
    """Verify public registration strictly assigns role='user' regardless of request payload."""
    reg_payload = {
        "email": "hacker@example.com",
        "password": "StrongPassword@2026",
        "full_name": "Privilege Escalation Attempt",
        "role": "admin"
    }
    response = client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "user"
    assert data["role"] != "admin"

def test_weak_password_rejected_on_registration(client: TestClient):
    """Verify registration rejects passwords violating policy with HTTP 422."""
    weak_passwords = [
        "short1!",
        "alllowercase123!",
        "ALLUPPERCASE123!",
        "NoSpecialChar123",
        "NoDigitsInThisPass!"
    ]
    for weak_pwd in weak_passwords:
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": f"weak_{hash(weak_pwd)}@example.com", "password": weak_pwd, "full_name": "Weak User"}
        )
        assert resp.status_code == 422, f"Failed for weak password: {weak_pwd}"

def test_password_change_requires_current_password(client: TestClient, normal_user_token_headers):
    """Verify password change fails with HTTP 422 if current_password is missing."""
    resp = client.put(
        "/api/v1/auth/me",
        headers=normal_user_token_headers,
        json={"password": "NewStrongPassword@2026"}
    )
    assert resp.status_code == 422
    assert "current password is required" in resp.json()["detail"].lower()

def test_password_change_rejects_incorrect_current_password(client: TestClient, normal_user_token_headers):
    """Verify password change fails with HTTP 400 if current_password is wrong."""
    resp = client.put(
        "/api/v1/auth/me",
        headers=normal_user_token_headers,
        json={
            "current_password": "WrongPassword@123",
            "password": "NewStrongPassword@2026"
        }
    )
    assert resp.status_code == 400
    assert "incorrect current password" in resp.json()["detail"].lower()

def test_password_change_rejects_password_reuse(client: TestClient, normal_user_token_headers):
    """Verify password change fails with HTTP 400 when attempting to reuse current password."""
    resp = client.put(
        "/api/v1/auth/me",
        headers=normal_user_token_headers,
        json={
            "current_password": "TestPassword123!",
            "password": "TestPassword123!"
        }
    )
    assert resp.status_code == 400
    assert "cannot be the same" in resp.json()["detail"].lower()

def test_password_change_revokes_existing_tokens(client: TestClient, normal_user_token_headers):
    """Verify that changing a user's password invalidates previously issued JWT tokens."""
    token = normal_user_token_headers["Authorization"].split(" ")[1]
    
    # 1. Verify token works initially
    me_resp = client.get("/api/v1/auth/me", headers=normal_user_token_headers)
    assert me_resp.status_code == 200

    # 2. Update password
    update_resp = client.put(
        "/api/v1/auth/me",
        headers=normal_user_token_headers,
        json={
            "current_password": "TestPassword123!",
            "password": "UpdatedPassword@2026"
        }
    )
    assert update_resp.status_code == 200

    # 3. Subsequent request with the OLD token must be rejected (revoked session)
    old_token_resp = client.get("/api/v1/auth/me", headers=normal_user_token_headers)
    assert old_token_resp.status_code == 401

def test_insecure_secret_key_prevents_production_startup():
    """Verify that starting in production with an insecure or missing SECRET_KEY raises RuntimeError."""
    # Test known default key
    with pytest.raises(RuntimeError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            SECRET_KEY="supersecretkeychangeinproduction1234567890"
        ).validate_security()
    assert "Production startup aborted" in str(exc_info.value)

    # Test short secret key
    with pytest.raises(RuntimeError):
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            SECRET_KEY="too-short"
        ).validate_security()

    # Test production with DEBUG=True
    with pytest.raises(RuntimeError):
        Settings(
            ENVIRONMENT="production",
            DEBUG=True,
            SECRET_KEY="a" * 32
        ).validate_security()

    # Valid production settings should succeed
    valid_settings = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        SECRET_KEY="cryptographically-random-secure-key-32chars-min"
    )
    valid_settings.validate_security()

def test_rate_limiting_enforcement_and_retry_after():
    """Verify rate limiter blocks requests exceeding the tier and includes Retry-After."""
    test_id = "test_client_rl_123"
    tier = "auth"
    _MEM_RATE_LOG.clear()

    # Auth tier allows 10 requests per minute
    for _ in range(10):
        allowed, retry_after = check_rate_limit(test_id, tier, redis_client=None)
        assert allowed is True
        assert retry_after == 0

    # 11th request must be rejected
    allowed, retry_after = check_rate_limit(test_id, tier, redis_client=None)
    assert allowed is False
    assert retry_after > 0
    assert retry_after <= 60

def test_rate_limiting_redis_unavailable_fallback():
    """Verify that when Redis is unavailable, rate limiter safely falls back to memory limiter."""
    test_id = "test_redis_fallback_user"
    tier = "upload"
    _MEM_RATE_LOG.clear()

    # Passing redis_client=None simulates Redis down
    # Upload tier allows 15 requests
    for i in range(15):
        allowed, retry = check_rate_limit(test_id, tier, redis_client=None)
        assert allowed is True

    # 16th attempt must be throttled, never unlimited
    allowed, retry = check_rate_limit(test_id, tier, redis_client=None)
    assert allowed is False
    assert retry > 0

def test_private_uploads_require_authentication(client: TestClient):
    """Verify accessing /uploads or /api/v1/uploads without credentials returns HTTP 401."""
    resp = client.get("/api/v1/uploads/users/1/receipts/private.png")
    assert resp.status_code == 401

    resp_root = client.get("/uploads/users/1/receipts/private.png")
    assert resp_root.status_code == 401

def test_path_traversal_rejected(client: TestClient, normal_user_token_headers):
    """Verify path traversal sequences are rejected."""
    traversal_paths = [
        "../etc/passwd",
        "..%2F..%2Fetc%2Fpasswd",
        "users/../../secrets.env"
    ]
    for path in traversal_paths:
        resp = client.get(f"/api/v1/uploads/{path}", headers=normal_user_token_headers)
        assert resp.status_code in (400, 404)

def test_cross_user_file_access_forbidden(client: TestClient):
    """Verify User A cannot access User B's files (HTTP 403 Forbidden)."""
    # Create User A
    client.post(
        "/api/v1/auth/register",
        json={"email": "usera@example.com", "password": "UserA@Password123", "full_name": "User A"}
    )
    login_a = client.post("/api/v1/auth/login", data={"username": "usera@example.com", "password": "UserA@Password123"}).json()
    token_a = login_a["access_token"]
    user_a_id = decode_access_token(token_a)

    # Attempt to access User 999's folder with User A's token
    resp = client.get(
        "/api/v1/uploads/users/999/receipts/statement.pdf",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert resp.status_code == 403
    assert "Forbidden" in resp.json()["detail"]
