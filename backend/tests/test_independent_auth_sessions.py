import time
import pytest
import fakeredis
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.core.security import (
    create_access_token,
    decode_access_token,
    revoke_user_sessions,
    is_token_revoked,
    RevocationStoreUnavailableError,
    _REVOKED_USERS
)

def test_registration_privilege_escalation_blocked(client: TestClient):
    """Verify that client-supplied role='admin' in registration payload is ignored."""
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "attacker_admin@example.com", "password": "ComplexPassword@123", "role": "admin"}
    )
    assert res.status_code == 201
    user_data = res.json()
    assert user_data["role"] == "user"
    assert user_data["role"] != "admin"

def test_redis_backed_revocation_across_multiple_workers():
    """
    Verify that when Worker 1 revokes a user's sessions in shared Redis,
    Worker 2 immediately recognizes the token as revoked.
    """
    server = fakeredis.FakeServer()
    worker_1_redis = fakeredis.FakeRedis(server=server, decode_responses=True)
    worker_2_redis = fakeredis.FakeRedis(server=server, decode_responses=True)

    user_id = 456
    token = create_access_token(subject=user_id)

    # Worker 2 verifies token is valid initially
    with patch("app.core.security.get_redis_client", return_value=worker_2_redis):
        sub = decode_access_token(token)
        assert sub == str(user_id)

    # Worker 1 revokes sessions for this user in Redis
    with patch("app.core.security.get_redis_client", return_value=worker_1_redis):
        revoke_user_sessions(user_id)

    # Worker 2 must now immediately see the token as revoked
    with patch("app.core.security.get_redis_client", return_value=worker_2_redis):
        sub_after = decode_access_token(token)
        assert sub_after is None, "Worker 2 should observe token revocation from shared Redis"

def test_production_fails_closed_when_redis_is_unavailable():
    """
    Production Session Security Requirement:
    In production, if Redis is down, authentication must FAIL CLOSED (reject token),
    and process-local fallback must NOT be used.
    """
    user_id = 888
    token = create_access_token(subject=user_id)

    with patch("app.core.config.settings.ENVIRONMENT", "production"):
        with patch("app.core.security.get_redis_client", return_value=None):
            # 1. Attempting to revoke sessions in production with Redis down raises RevocationStoreUnavailableError
            with pytest.raises(RevocationStoreUnavailableError):
                revoke_user_sessions(user_id)

            # 2. Attempting to decode/validate token in production with Redis down raises RevocationStoreUnavailableError (fails closed)
            with pytest.raises(RevocationStoreUnavailableError):
                decode_access_token(token)

def test_production_password_change_aborts_with_503_on_redis_outage(client: TestClient, normal_user_token_headers):
    """
    Verify that in production, attempting to update password when Redis is down
    fails closed with HTTP 503 and does NOT partially commit without session revocation.
    """
    with patch("app.core.config.settings.ENVIRONMENT", "production"):
        with patch("app.core.security.get_redis_client", return_value=None):
            res = client.put(
                "/api/v1/auth/me",
                headers=normal_user_token_headers,
                json={
                    "current_password": "TestPassword123!",
                    "password": "NewStrongPassword@2026"
                }
            )
            assert res.status_code == 503
            detail = res.json()["detail"]
            assert "unreachable" in detail or "unavailable" in detail

def test_development_fallback_retained_on_redis_outage():
    """
    Verify that when ENVIRONMENT=development, session revocation falls back to
    process-local memory so local development can proceed without Redis.
    """
    _REVOKED_USERS.clear()
    user_id = 789
    token = create_access_token(subject=user_id)

    with patch("app.core.config.settings.ENVIRONMENT", "development"):
        with patch("app.core.security.get_redis_client", return_value=None):
            # Before revocation: token is accepted
            assert decode_access_token(token) == str(user_id)

            # User revokes session while Redis is down
            revoke_user_sessions(user_id)

            # After revocation: token is rejected via memory fallback
            assert decode_access_token(token) is None
