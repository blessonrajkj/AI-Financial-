from pydantic import BaseModel
from datetime import datetime
from typing import Any

# Subscription
class SubscriptionBase(BaseModel):
    name: str
    amount: float
    billing_cycle: str = "monthly"
    next_billing_date: datetime
    is_active: bool = True

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionOut(SubscriptionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

# Investment
class InvestmentBase(BaseModel):
    asset_name: str
    asset_type: str
    quantity: float
    purchase_price: float
    current_price: float
    purchase_date: datetime | None = None

class InvestmentCreate(InvestmentBase):
    pass

class InvestmentOut(InvestmentBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

# Notification
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

# Chat
class ChatQuery(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str
    created_at: datetime

    class Config:
        from_attributes = True

# Voice Log
class VoiceTranscript(BaseModel):
    transcript: str

class VoiceLogOut(BaseModel):
    id: int
    transcript: str
    parsed_json: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
