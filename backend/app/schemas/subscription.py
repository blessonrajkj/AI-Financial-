from pydantic import BaseModel, ConfigDict
from datetime import datetime

class SubscriptionBase(BaseModel):
    name: str
    amount: float
    billing_cycle: str = "monthly"  # monthly, yearly
    next_billing_date: datetime
    is_active: bool = True
    is_autopay: bool = False

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    name: str | None = None
    amount: float | None = None
    billing_cycle: str | None = None
    next_billing_date: datetime | None = None
    is_active: bool | None = None
    is_autopay: bool | None = None

class SubscriptionOut(SubscriptionBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
