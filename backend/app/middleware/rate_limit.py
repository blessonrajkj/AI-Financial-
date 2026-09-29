import os
import time
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

IP_REQUEST_LOG = defaultdict(list)
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_ATTEMPTS = 15

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Bypass rate limiter during automated testing
        if os.getenv("TESTING") == "True" or os.getenv("PYTEST_CURRENT_TEST"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        path = request.url.path

        if "/auth/" in path or "/upload" in path or "/import" in path:
            now = time.time()
            timestamps = IP_REQUEST_LOG[client_ip]
            valid_timestamps = [ts for ts in timestamps if now - ts < RATE_LIMIT_WINDOW_SECONDS]
            IP_REQUEST_LOG[client_ip] = valid_timestamps

            if len(valid_timestamps) >= RATE_LIMIT_MAX_ATTEMPTS:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please wait 60 seconds before retrying."
                )

            IP_REQUEST_LOG[client_ip].append(now)

        return await call_next(request)
