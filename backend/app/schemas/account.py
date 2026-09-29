from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import datetime

class AccountBase(BaseModel):
    account_name: str
    bank_name: str
    account_type: str = "Savings"
    balance: Decimal = Decimal("0.00")
    currency: str = "INR"
    account_number_mask: str | None = None
    is_active: bool = True

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    account_name: str | None = None
    bank_name: str | None = None
    account_type: str | None = None
    balance: Decimal | None = None
    currency: str | None = None
    account_number_mask: str | None = None
    is_active: bool | None = None

class AccountOut(AccountBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
