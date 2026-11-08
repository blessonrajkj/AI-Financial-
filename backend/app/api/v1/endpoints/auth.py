from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import os
import shutil
from datetime import timedelta

from sqlalchemy import func
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.schemas.auth import Token

router = APIRouter()

import traceback

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        # Check if user exists (case-insensitive & trimmed)
        clean_email = (user_in.email or "").strip().lower()
        user = db.query(User).filter(func.lower(User.email) == clean_email).first()
        if user:
            raise HTTPException(
                status_code=400,
                detail="The user with this email already exists in the system.",
            )
        
        # Enforce strict password strength requirements
        is_valid_pwd, pwd_error = security.validate_password_strength(user_in.password)
        if not is_valid_pwd:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=pwd_error
            )
        
        hashed_password = security.get_password_hash(user_in.password)
        db_user = User(
            email=clean_email,
            hashed_password=hashed_password,
            full_name=user_in.full_name,
            role="user",  # Strict server-side assignment; never trust client-supplied role
            is_active=True,
            is_verified=False
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise


@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    clean_email = (form_data.username or "").strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
):
    return current_user

@router.put("/me", response_model=UserOut)
def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
):
    if user_in.email is not None and user_in.email != current_user.email:
        # Check if email is already taken
        existing_user = db.query(User).filter(User.email == user_in.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered.",
            )
        current_user.email = user_in.email

    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    
    if user_in.password is not None:
        if not user_in.current_password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Current password is required to change password."
            )
        if not security.verify_password(user_in.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password."
            )
        if security.verify_password(user_in.password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password cannot be the same as the current password."
            )
        is_valid_pwd, pwd_error = security.validate_password_strength(user_in.password)
        if not is_valid_pwd:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=pwd_error
            )
        try:
            security.revoke_user_sessions(current_user.id)
        except security.RevocationStoreUnavailableError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Password update failed: Session security store is unreachable. Password change aborted for account security."
            )
        current_user.hashed_password = security.get_password_hash(user_in.password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

from app.services.storage import storage_service, generate_object_key

@router.post("/me/avatar", response_model=UserOut)
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
):
    # Verify file extension
    ext = os.path.splitext(file.filename)[1]
    if ext.lower() not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG and PNG images are allowed."
        )
        
    object_key = generate_object_key(current_user.id, "avatars", file.filename)
    file_bytes = file.file.read()
    storage_service.upload_file(file_bytes, object_key, content_type=file.content_type)
        
    current_user.avatar_url = storage_service.get_url(object_key)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
