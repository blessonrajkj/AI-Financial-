import os
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Tuple, Optional
import bcrypt
from jose import jwt, JWTError

class RevocationStoreUnavailableError(Exception):
    """Raised when the distributed revocation store (Redis) is unreachable in production."""
    pass

# In-memory revocation cache fallback (strictly used ONLY when ENVIRONMENT != production)
_REVOKED_USERS: dict[str, int] = {}

def get_redis_client():
    from app.core.redis_client import get_redis_client as _get_client
    return _get_client()

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Enforces strict password policy:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit."
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character."
    return True, "Password meets strength requirements."

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8')[:72], hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8')[:72], salt).decode('utf-8')

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    from app.core.config import settings
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "iat": int(now.timestamp())
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def revoke_user_sessions(user_id: Union[str, int]) -> None:
    """
    Invalidates all tokens issued for this user prior to or at the current timestamp.
    In production: Persists strictly to shared Redis. Fails closed if Redis is unreachable.
    In development: Persists to Redis if available, with in-memory fallback.
    """
    from app.core.config import settings
    env = (getattr(settings, "ENVIRONMENT", "development") or "development").lower()
    is_prod = env in ("production", "prod")

    cutoff = int(time.time())
    uid_str = str(user_id)

    r = get_redis_client()
    if r is not None:
        try:
            ttl = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            r.set(f"revoked_user:{uid_str}", cutoff, ex=ttl)
            if not is_prod:
                _REVOKED_USERS[uid_str] = cutoff
            return
        except Exception:
            r = None

    if is_prod:
        # Production security requirement: No process-local fallback. Fail closed.
        raise RevocationStoreUnavailableError(
            "Cannot revoke user sessions: distributed session revocation store is unreachable."
        )
    else:
        # Development fallback only
        _REVOKED_USERS[uid_str] = cutoff

def is_token_revoked(user_id: Union[str, int], token_iat: Optional[int]) -> bool:
    """
    Checks if a token was issued before or at the user's latest revocation cutoff.
    In production: Fails closed (raises RevocationStoreUnavailableError) if shared Redis is down.
    In development: Falls back to process-local memory.
    """
    from app.core.config import settings
    env = (getattr(settings, "ENVIRONMENT", "development") or "development").lower()
    is_prod = env in ("production", "prod")
    uid_str = str(user_id)

    r = get_redis_client()
    if r is not None:
        try:
            val = r.get(f"revoked_user:{uid_str}")
            if val is not None:
                cutoff = int(val)
                if token_iat is None or token_iat <= cutoff:
                    return True
            return False
        except Exception:
            r = None

    if is_prod:
        # Production security requirement: Fail closed when revocation store is offline
        raise RevocationStoreUnavailableError(
            "Authentication verification failure: distributed session revocation store is unreachable."
        )
    else:
        # Development fallback only
        cutoff = _REVOKED_USERS.get(uid_str)
        if cutoff is not None:
            if token_iat is None or token_iat <= cutoff:
                return True
        return False

def decode_access_token(token: str) -> Optional[str]:
    from app.core.config import settings
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub = decoded_token.get("sub")
        if not sub:
            return None
        iat = decoded_token.get("iat")
        if is_token_revoked(sub, iat):
            return None
        return sub
    except RevocationStoreUnavailableError:
        # Re-raise to allow endpoints to return 503 (fail closed)
        raise
    except JWTError:
        return None
