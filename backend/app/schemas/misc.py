from pydantic import BaseModel, ConfigDict
from datetime import datetime

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

    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)

# Notification
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Chat
class ChatQuery(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Voice Log
class VoiceTranscript(BaseModel):
    transcript: str

class VoiceTransactionConfirm(BaseModel):
    voice_log_id: int
    amount: float
    merchant_name: str
    category_name: str
    description: str

class VoiceLogOut(BaseModel):
    id: int
    transcript: str
    parsed_json: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
