from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime

# ----------------- User Profile -----------------
class UserProfileBase(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    annual_income: Optional[float] = 0.0
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pin_code: Optional[str] = None
    preferred_currency: Optional[str] = "INR"
    preferred_language: Optional[str] = "English"
    time_zone: Optional[str] = "Asia/Kolkata"

class UserProfileUpdate(UserProfileBase):
    full_name: Optional[str] = None

class UserProfileOut(UserProfileBase):
    user_id: int
    full_name: Optional[str] = None
    email: str
    avatar_url: Optional[str] = None
    created_at: datetime
    is_verified: bool
    role: str

    model_config = ConfigDict(from_attributes=True)

# ----------------- Linked Bank Accounts -----------------
class LinkedBankBase(BaseModel):
    bank_name: str
    account_holder: str
    account_number: str
    ifsc_code: str
    branch: Optional[str] = None
    account_type: str = "Savings"
    nickname: Optional[str] = None
    is_primary: bool = False

class LinkedBankCreate(LinkedBankBase):
    pass

class LinkedBankUpdate(BaseModel):
    nickname: Optional[str] = None
    is_primary: Optional[bool] = None

class LinkedBankOut(LinkedBankBase):
    id: int
    user_id: int

    @field_validator("account_number", mode="after")
    @classmethod
    def mask_acc(cls, v: str) -> str:
        if not v:
            return ""
        clean = str(v).strip()
        if len(clean) <= 4:
            return clean
        return f"••••{clean[-4:]}"

    model_config = ConfigDict(from_attributes=True)

class DeleteAccountIn(BaseModel):
    password: str

# ----------------- User Settings -----------------
class UserSettingsBase(BaseModel):
    push_notifications: bool = True
    email_notifications: bool = True
    sms_notifications: bool = True
    bill_reminders: bool = True
    investment_alerts: bool = True
    budget_alerts: bool = True
    subscription_alerts: bool = True
    salary_credit_alerts: bool = True
    two_factor_enabled: bool = False
    two_factor_method: str = "App"
    privacy_mode: bool = False
    theme: str = "dark"

class UserSettingsUpdate(UserSettingsBase):
    pass

class UserSettingsOut(UserSettingsBase):
    user_id: int

    model_config = ConfigDict(from_attributes=True)

# ----------------- Change Password -----------------
class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str
