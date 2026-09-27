from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil
import uuid
import re
from typing import List

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.profile import UserProfile, LinkedBank, UserSettings
from app.schemas.profile_schema import (
    UserProfileUpdate,
    UserProfileOut,
    LinkedBankCreate,
    LinkedBankUpdate,
    LinkedBankOut,
    UserSettingsUpdate,
    UserSettingsOut,
    ChangePasswordIn
)

router = APIRouter()

# Helper: Ensure profile & settings row exists in DB
def get_or_create_profile_and_settings(db: Session, user: User):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(
            user_id=user.id,
            username=user.email.split('@')[0],
            preferred_currency="INR",
            preferred_language="English",
            time_zone="Asia/Kolkata"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    config = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not config:
        config = UserSettings(
            user_id=user.id,
            push_notifications=True,
            email_notifications=True,
            sms_notifications=True,
            bill_reminders=True,
            investment_alerts=True,
            budget_alerts=True,
            subscription_alerts=True,
            salary_credit_alerts=True,
            two_factor_enabled=False
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        
    return profile, config

# ----------------- User Profile APIs -----------------

@router.get("/profile", response_model=UserProfileOut)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    profile, _ = get_or_create_profile_and_settings(db, current_user)
    return UserProfileOut(
        user_id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        is_verified=current_user.is_verified,
        role=current_user.role,
        username=profile.username,
        phone_number=profile.phone_number,
        date_of_birth=profile.date_of_birth,
        gender=profile.gender,
        occupation=profile.occupation,
        annual_income=profile.annual_income,
        address=profile.address,
        city=profile.city,
        state=profile.state,
        country=profile.country,
        pin_code=profile.pin_code,
        preferred_currency=profile.preferred_currency,
        preferred_language=profile.preferred_language,
        time_zone=profile.time_zone
    )

@router.put("/profile", response_model=UserProfileOut)
def update_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    profile, _ = get_or_create_profile_and_settings(db, current_user)
    
    # Update User full name if provided
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name
        db.add(current_user)

    # Update profile fields
    update_data = profile_in.model_dump(exclude_unset=True)
    if "full_name" in update_data:
        del update_data["full_name"]

    for field, value in update_data.items():
        setattr(profile, field, value)

    db.add(profile)
    db.commit()
    db.refresh(profile)
    db.refresh(current_user)

    return get_profile(db=db, current_user=current_user)

from app.services.storage import storage_service, generate_object_key

@router.post("/profile/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(status_code=400, detail="Unsupported file format.")

    # Save file via storage service
    object_key = generate_object_key(current_user.id, "avatars", file.filename)
    file_bytes = file.file.read()
    storage_service.upload_file(file_bytes, object_key, content_type=file.content_type)

    # Clean old avatar if exists
    if current_user.avatar_url:
        old_key = current_user.avatar_url.replace("/uploads/", "")
        try:
            storage_service.delete_file(old_key)
        except Exception:
            pass

    current_user.avatar_url = storage_service.get_url(object_key)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "avatar_url": current_user.avatar_url}

@router.delete("/profile/avatar")
def remove_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if current_user.avatar_url:
        old_key = current_user.avatar_url.replace("/uploads/", "")
        try:
            storage_service.delete_file(old_key)
        except Exception:
            pass
        current_user.avatar_url = None
        db.add(current_user)
        db.commit()
    return {"status": "success"}

# ----------------- User Settings APIs -----------------

@router.get("/settings", response_model=UserSettingsOut)
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    _, config = get_or_create_profile_and_settings(db, current_user)
    return config

@router.put("/settings", response_model=UserSettingsOut)
def update_user_settings(
    settings_in: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    _, config = get_or_create_profile_and_settings(db, current_user)
    for field, value in settings_in.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    db.add(config)
    db.commit()
    db.refresh(config)
    return config

@router.post("/auth/change-password")
def change_password(
    data: ChangePasswordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    if not security.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.hashed_password = security.get_password_hash(data.new_password)
    db.add(current_user)
    db.commit()
    return {"status": "success", "message": "Password updated successfully"}

# ----------------- Linked Banks APIs -----------------

@router.get("/banks", response_model=List[LinkedBankOut])
def get_linked_banks(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    return db.query(LinkedBank).filter(LinkedBank.user_id == current_user.id).all()

@router.post("/banks/link", response_model=LinkedBankOut)
def link_bank(
    bank_in: LinkedBankCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    # Validate IFSC code format (e.g. SBIN0001234)
    ifsc_regex = r"^[A-Z]{4}0[A-Z0-9]{6}$"
    if not re.match(ifsc_regex, bank_in.ifsc_code):
        raise HTTPException(status_code=400, detail="Invalid IFSC code format.")

    # Check if this bank is primary. If so, toggle off any existing primaries
    if bank_in.is_primary:
        db.query(LinkedBank).filter(
            LinkedBank.user_id == current_user.id,
            LinkedBank.is_primary == True
        ).update({LinkedBank.is_primary: False}, synchronize_session=False)

    db_bank = LinkedBank(
        user_id=current_user.id,
        bank_name=bank_in.bank_name,
        account_holder=bank_in.account_holder,
        account_number=bank_in.account_number,
        ifsc_code=bank_in.ifsc_code,
        branch=bank_in.branch or "Main Branch",
        account_type=bank_in.account_type,
        nickname=bank_in.nickname or bank_in.bank_name,
        is_primary=bank_in.is_primary
    )
    db.add(db_bank)
    db.commit()
    db.refresh(db_bank)
    return db_bank

@router.put("/banks/{id}", response_model=LinkedBankOut)
def update_bank(
    id: int,
    bank_in: LinkedBankUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_bank = db.query(LinkedBank).filter(
        LinkedBank.id == id,
        LinkedBank.user_id == current_user.id
    ).first()
    if not db_bank:
        raise HTTPException(status_code=404, detail="Bank account not found.")

    if bank_in.is_primary:
        # Toggle other accounts
        db.query(LinkedBank).filter(
            LinkedBank.user_id == current_user.id,
            LinkedBank.is_primary == True
        ).update({LinkedBank.is_primary: False}, synchronize_session=False)
        db_bank.is_primary = True

    if bank_in.nickname is not None:
        db_bank.nickname = bank_in.nickname

    db.add(db_bank)
    db.commit()
    db.refresh(db_bank)
    return db_bank

@router.delete("/banks/{id}")
def unlink_bank(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db_bank = db.query(LinkedBank).filter(
        LinkedBank.id == id,
        LinkedBank.user_id == current_user.id
    ).first()
    if not db_bank:
        raise HTTPException(status_code=404, detail="Bank account not found.")

    db.delete(db_bank)
    db.commit()
    return {"status": "success"}

# ----------------- Export & Delete Profile APIs -----------------

@router.get("/profile/export")
def export_profile_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    profile, config = get_or_create_profile_and_settings(db, current_user)
    banks = db.query(LinkedBank).filter(LinkedBank.user_id == current_user.id).all()
    
    export_data = {
        "user_id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "avatar_url": current_user.avatar_url,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "is_verified": current_user.is_verified,
        "profile": {
            "username": profile.username,
            "phone_number": profile.phone_number,
            "date_of_birth": profile.date_of_birth,
            "gender": profile.gender,
            "occupation": profile.occupation,
            "annual_income": profile.annual_income,
            "address": profile.address,
            "city": profile.city,
            "state": profile.state,
            "country": profile.country,
            "pin_code": profile.pin_code,
            "preferred_currency": profile.preferred_currency,
            "preferred_language": profile.preferred_language,
            "time_zone": profile.time_zone
        },
        "settings": {
            "push_notifications": config.push_notifications,
            "email_notifications": config.email_notifications,
            "sms_notifications": config.sms_notifications,
            "bill_reminders": config.bill_reminders,
            "investment_alerts": config.investment_alerts,
            "budget_alerts": config.budget_alerts,
            "subscription_alerts": config.subscription_alerts,
            "salary_credit_alerts": config.salary_credit_alerts,
            "two_factor_enabled": config.two_factor_enabled,
            "two_factor_method": config.two_factor_method,
            "privacy_mode": config.privacy_mode,
            "theme": config.theme
        },
        "linked_banks": [
            {
                "id": b.id,
                "bank_name": b.bank_name,
                "account_holder": b.account_holder,
                "account_number": b.account_number,
                "ifsc_code": b.ifsc_code,
                "branch": b.branch,
                "account_type": b.account_type,
                "nickname": b.nickname,
                "is_primary": b.is_primary
            } for b in banks
        ]
    }
    return export_data

@router.delete("/profile")
def delete_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user)
):
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": "Account deleted successfully."}

