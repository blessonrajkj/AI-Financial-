import os
import time
import math
import uuid
from typing import Optional
from collections import defaultdict
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from jose import jwt

# In-memory rate limiting fallback log when Redis is unreachable.
# Development fallback: Ensures development remains available while production fails closed on sensitive endpoints.
_MEM_RATE_LOG: dict[str, list[float]] = defaultdict(list)

# Tier definitions: (window_seconds, max_requests)
TIER_LIMITS = {
    "auth": (60, 10),       # 10 req/min for auth brute force protection
    "upload": (60, 15),     # 15 req/min for OCR / file uploads
    "ai": (60, 20),         # 20 req/min for expensive AI / forecast operations
    "api": (60, 100),       # 100 req/min default API tier
}

EXEMPT_PATHS = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/health"
}

def get_redis_client():
    from app.core.redis_client import get_redis_client as _get_client
    return _get_client()

def determine_tier(path: str) -> Optional[str]:
    """Determines rate limit tier based on request path."""
    for exempt in EXEMPT_PATHS:
        if path == exempt or path == exempt + "/":
            return None
            
    clean_path = path.rstrip("/")
    if clean_path.endswith(("/auth/login", "/auth/register", "/auth/change-password")):
        return "auth"
    elif "/upload" in path or "/receipts" in path or "/import" in path:
        return "upload"
    elif "/ai/" in path:
        return "ai"
    elif path.startswith("/api/"):
        return "api"
    return None

def resolve_identifier(request: Request) -> str:
    """
    Extracts authenticated user identity from Bearer token if present.
    Otherwise safely falls back to direct client IP, preventing spoofing via untrusted forwarded headers.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            from app.core.config import settings
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
            
    # Direct socket client IP to prevent spoofing
    client_ip = request.client.host if request.client else "127.0.0.1"
    return f"ip:{client_ip}"

class RateLimitResult(tuple):
    def __new__(cls, allowed: bool, retry_after: int, mode: str = "ok"):
        return super().__new__(cls, (allowed, retry_after))

    def __init__(self, allowed: bool, retry_after: int, mode: str = "ok"):
        self.allowed = allowed
        self.retry_after = retry_after
        self.mode = mode


def check_rate_limit(
    identifier: str,
    tier: str,
    redis_client = None,
    environment: Optional[str] = None
) -> RateLimitResult:
    """
    Evaluates rate limit using distributed Redis sliding window.
    Behavior during Redis outages:
    - Production sensitive endpoints ("auth", "upload") FAIL CLOSED (HTTP 503 / 429).
    - Development and non-sensitive tiers fall back to in-memory sliding window.
    Returns RateLimitResult which unpacks cleanly as (allowed, retry_after) while providing .mode.
    """
    from app.core.config import settings
    env = (environment or getattr(settings, "ENVIRONMENT", "development")).lower()
    is_production = env in ("production", "prod")

    window, max_requests = TIER_LIMITS.get(tier, (60, 60))
    now = time.time()
    rate_key = f"ratelimit:{tier}:{identifier}"

    if redis_client is not None:
        try:
            clear_before = now - window
            pipe = redis_client.pipeline()
            pipe.zremrangebyscore(rate_key, "-inf", clear_before)
            pipe.zcard(rate_key)
            pipe.zrange(rate_key, 0, 0, withscores=True)
            results = pipe.execute()
            
            current_count = results[1]
            oldest_list = results[2]
            
            if current_count >= max_requests:
                oldest_score = oldest_list[0][1] if oldest_list else (now - window)
                retry_after = max(1, int(math.ceil(window - (now - oldest_score))))
                return RateLimitResult(False, retry_after, "redis")
                
            # Under limit: Record attempt and set TTL
            pipe = redis_client.pipeline()
            member_id = f"{now}:{uuid.uuid4().hex[:8]}"
            pipe.zadd(rate_key, {member_id: now})
            pipe.expire(rate_key, window + 5)
            pipe.execute()
            return RateLimitResult(True, 0, "redis")
        except Exception:
            redis_client = None

    # Redis is down / unavailable:
    if is_production and tier in ("auth", "upload"):
        # Security requirement: In production, sensitive endpoints fail closed during cache outage
        return RateLimitResult(False, 60, "fail_closed")

    # Development fallback (and non-sensitive tiers): in-memory sliding log
    timestamps = _MEM_RATE_LOG[rate_key]
    valid_ts = [t for t in timestamps if now - t < window]
    
    if len(valid_ts) >= max_requests:
        oldest_ts = valid_ts[0]
        retry_after = max(1, int(math.ceil(window - (now - oldest_ts))))
        _MEM_RATE_LOG[rate_key] = valid_ts
        return RateLimitResult(False, retry_after, "in_memory")
        
    valid_ts.append(now)
    _MEM_RATE_LOG[rate_key] = valid_ts
    return RateLimitResult(True, 0, "in_memory")

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        is_testing = (
            os.getenv("TESTING") == "True"
            or os.getenv("PYTEST_CURRENT_TEST")
            or request.headers.get("X-E2E-Test") == "true"
        )
        force_test = request.headers.get("X-Test-Rate-Limit") == "true"
        if is_testing and not force_test:
            return await call_next(request)

        path = request.url.path
        tier = determine_tier(path)
        if not tier:
            return await call_next(request)

        identifier = resolve_identifier(request)
        r = get_redis_client()
        
        res = check_rate_limit(identifier, tier, redis_client=r)
        if not res.allowed:
            if res.mode == "fail_closed":
                return JSONResponse(
                    status_code=503,
                    content={
                        "detail": f"Service temporarily unavailable: rate limiting cluster is unreachable. Sensitive endpoint {tier} failed closed for security.",
                        "tier": tier,
                        "retry_after": res.retry_after
                    },
                    headers={
                        "Retry-After": str(res.retry_after)
                    }
                )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Rate limit exceeded for {tier} tier. Please wait {res.retry_after} seconds before retrying.",
                    "tier": tier,
                    "retry_after": res.retry_after
                },
                headers={
                    "Retry-After": str(res.retry_after)
                }
            )

        return await call_next(request)
