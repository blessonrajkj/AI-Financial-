import os
import time
import hmac
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token, RevocationStoreUnavailableError
from app.models.user import User

router = APIRouter()

# Public assets that can be viewed without authentication (e.g. system avatars)
PUBLIC_STATIC_WHITELIST = {
    "avatars/default.png",
    "avatars/default_avatar.png",
    "system/logo.png"
}

def verify_signed_url(clean_path: str, uid: Optional[str], exp: Optional[str], sig: Optional[str]) -> tuple[bool, Optional[int]]:
    """Validates an HMAC-signed upload URL."""
    if not (uid and exp and sig):
        return False, None
    try:
        exp_int = int(exp)
        uid_int = int(uid)
    except (ValueError, TypeError):
        return False, None

    # Check expiration
    if time.time() > exp_int:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signed URL has expired."
        )

    # Recompute HMAC signature
    payload = f"{clean_path}:{uid_int}:{exp_int}"
    expected_sig = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature on signed URL."
        )
    return True, uid_int

def resolve_requesting_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    token_str = None
    if authorization and authorization.startswith("Bearer "):
        token_str = authorization.split(" ", 1)[1].strip()
    elif token:
        token_str = token.strip()
        
    if not token_str:
        return None
        
    try:
        sub = decode_access_token(token_str)
    except RevocationStoreUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable: session security cluster is offline."
        )
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token."
        )
        
    try:
        user_id = int(sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identity in token."
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive."
        )
    return user

@router.get("/{file_path:path}")
def serve_secure_upload(
    file_path: str,
    uid: Optional[str] = Query(None),
    exp: Optional[str] = Query(None),
    sig: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(resolve_requesting_user)
):
    """
    Secure file serving endpoint:
    - Rejects directory traversal attempts.
    - Requires active authentication OR valid, unexpired signed URL.
    - Strictly blocks cross-user file access.
    - Prevents legacy unauthenticated access bypass.
    """
    # 1. Path traversal defense
    clean_path = os.path.normpath(file_path.strip()).replace("\\", "/")
    if ".." in clean_path or clean_path.startswith("/") or clean_path.startswith("\\"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path traversal sequence.")
        
    upload_root = os.path.abspath(settings.UPLOAD_DIR)
    full_path = os.path.abspath(os.path.join(upload_root, clean_path))
    
    if not full_path.startswith(upload_root):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Directory traversal attempt detected.")

    # 2. Public asset whitelist check
    if clean_path in PUBLIC_STATIC_WHITELIST:
        if os.path.isfile(full_path):
            return FileResponse(full_path)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    # 3. Authentication & Signed URL Verification
    is_signed_valid, signed_uid = verify_signed_url(clean_path, uid, exp, sig)

    if not current_user and not is_signed_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access uploaded files."
        )

    # Effective accessing user ID
    acting_user_id = current_user.id if current_user else signed_uid
    is_admin = current_user.role == "admin" if current_user else False

    # 4. Ownership and Scoping Checks
    parts = clean_path.split("/")
    if len(parts) >= 2 and parts[0] == "users":
        target_uid_str = parts[1]
        if str(acting_user_id) != target_uid_str and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You do not have permission to access another user's files."
            )
    else:
        # Legacy non-user upload paths (e.g., receipts/...) cannot be accessed by arbitrary users
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Access to legacy upload path is restricted."
            )

    # 5. File existence check
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    return FileResponse(full_path)
