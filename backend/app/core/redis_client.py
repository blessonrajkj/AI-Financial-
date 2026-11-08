import time
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("redis_client")

_pool = None
_client = None
_down_until: float = 0.0
_COOLDOWN_SECONDS: float = 3.0

def get_redis_client():
    """
    Returns a thread-safe pooled Redis client singleton.
    Features:
    - Normalizes localhost -> 127.0.0.1 to avoid Windows IPv6 dual-stack resolution latency.
    - Fast socket timeouts (0.2s connect, 0.5s read) to prevent blocking HTTP workers.
    - 3-second failure cooldown circuit-breaker when Redis is offline to eliminate repeated socket delays.
    - Reusable connection pool when Redis is online.
    """
    global _pool, _client, _down_until

    # Check circuit-breaker cooldown
    now = time.time()
    if now < _down_until:
        return None

    redis_url = getattr(settings, "REDIS_URL", None)
    if not redis_url:
        return None

    # Replace localhost with 127.0.0.1 to eliminate IPv6 lookup latency on Windows
    if "localhost" in redis_url:
        redis_url = redis_url.replace("localhost", "127.0.0.1")

    try:
        import redis
        if _pool is None:
            _pool = redis.ConnectionPool.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=0.2,
                socket_timeout=0.5,
                max_connections=20
            )
        
        client = redis.Redis(connection_pool=_pool)
        client.ping()
        _client = client
        return _client
    except Exception as e:
        # Trip circuit-breaker for _COOLDOWN_SECONDS
        _down_until = time.time() + _COOLDOWN_SECONDS
        _pool = None
        _client = None
        return None

def reset_redis_client_cache():
    """Utility for testing to reset circuit-breaker and connection pool."""
    global _pool, _client, _down_until
    _pool = None
    _client = None
    _down_until = 0.0
