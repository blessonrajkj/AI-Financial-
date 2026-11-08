import time
import pytest
import fakeredis
from fastapi.testclient import TestClient
from app.middleware.rate_limit import check_rate_limit, TIER_LIMITS, _MEM_RATE_LOG
from app.main import app

def test_redis_distributed_rate_limiting_across_multiple_workers():
    """
    Verify that multiple distinct worker client instances sharing the same Redis server
    synchronize their rate limit state and enforce the limit jointly.
    """
    server = fakeredis.FakeServer()
    worker_1 = fakeredis.FakeRedis(server=server, decode_responses=True)
    worker_2 = fakeredis.FakeRedis(server=server, decode_responses=True)
    worker_3 = fakeredis.FakeRedis(server=server, decode_responses=True)

    test_user_id = "user:audit_worker_sync_101"
    tier = "auth"
    max_requests = TIER_LIMITS[tier][1]  # 10 req/min

    # Distribute 10 requests evenly across worker 1 and worker 2
    for i in range(5):
        res = check_rate_limit(test_user_id, tier, redis_client=worker_1)
        assert res.allowed is True
        assert res.mode == "redis"

    for i in range(5):
        res = check_rate_limit(test_user_id, tier, redis_client=worker_2)
        assert res.allowed is True
        assert res.mode == "redis"

    # Worker 3 (third worker instance) must now see that the joint limit has been reached
    res3 = check_rate_limit(test_user_id, tier, redis_client=worker_3)
    assert res3.allowed is False
    assert res3.mode == "redis"
    assert res3.retry_after > 0
    assert res3.retry_after <= 60

def test_production_sensitive_endpoints_fail_closed_on_redis_outage():
    """
    Security verification:
    When running in production, if Redis suffers an outage, sensitive endpoints
    ('auth', 'upload') must FAIL CLOSED rather than leaving endpoints unthrottled.
    """
    test_id = "user:attacker_target"
    
    # 1. Sensitive auth endpoint in production with Redis unavailable (redis_client=None)
    res_auth = check_rate_limit(
        identifier=test_id,
        tier="auth",
        redis_client=None,
        environment="production"
    )
    assert res_auth.allowed is False
    assert res_auth.mode == "fail_closed"
    assert res_auth.retry_after > 0

    # 2. Sensitive upload endpoint in production with Redis unavailable
    res_upload = check_rate_limit(
        identifier=test_id,
        tier="upload",
        redis_client=None,
        environment="production"
    )
    assert res_upload.allowed is False
    assert res_upload.mode == "fail_closed"

def test_development_fallback_remains_available_on_redis_outage():
    """
    Verify that in development mode, an outage or absence of Redis does not break
    developer workflows: the in-memory rate limiter smoothly handles requests.
    """
    _MEM_RATE_LOG.clear()
    dev_user = "user:dev_local_user"
    
    # First 10 auth requests in development succeed via memory fallback
    for _ in range(10):
        res = check_rate_limit(
            identifier=dev_user,
            tier="auth",
            redis_client=None,
            environment="development"
        )
        assert res.allowed is True
        assert res.mode == "in_memory"

    # 11th request is throttled by the in-memory fallback
    res11 = check_rate_limit(
        identifier=dev_user,
        tier="auth",
        redis_client=None,
        environment="development"
    )
    assert res11.allowed is False
    assert res11.mode == "in_memory"
    assert res11.retry_after > 0

def test_http_429_and_retry_after_headers_in_response(client: TestClient):
    """
    Verify that rate-limited HTTP responses return status 429 and include Retry-After header.
    """
    server = fakeredis.FakeServer()
    mock_redis = fakeredis.FakeRedis(server=server, decode_responses=True)

    from unittest.mock import patch
    with patch("app.middleware.rate_limit.get_redis_client", return_value=mock_redis):
        # Exceed limit for auth tier (10 allowed)
        for _ in range(10):
            res = client.post(
                "/api/v1/auth/login",
                data={"username": "rl_test@example.com", "password": "WrongPassword@123"},
                headers={"X-Test-Rate-Limit": "true"}
            )
            # Response might be 400 (bad credentials), but not 429
            assert res.status_code != 429

        # 11th request must trigger HTTP 429
        blocked_res = client.post(
            "/api/v1/auth/login",
            data={"username": "rl_test@example.com", "password": "WrongPassword@123"},
            headers={"X-Test-Rate-Limit": "true"}
        )
        assert blocked_res.status_code == 429
        assert "Retry-After" in blocked_res.headers
        retry_val = int(blocked_res.headers["Retry-After"])
        assert 0 < retry_val <= 60
        assert "Rate limit exceeded" in blocked_res.json()["detail"]
