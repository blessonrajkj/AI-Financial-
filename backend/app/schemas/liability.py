from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import datetime

class LiabilityBase(BaseModel):
    name: str
    liability_type: str
    total_amount: Decimal
    remaining_amount: Decimal
    interest_rate: Decimal = Decimal("0.00")
    minimum_payment: Decimal = Decimal("0.00")
    due_date: datetime | None = None
    status: str = "Active"

class LiabilityCreate(LiabilityBase):
    pass

class LiabilityUpdate(BaseModel):
    name: str | None = None
    liability_type: str | None = None
    total_amount: Decimal | None = None
    remaining_amount: Decimal | None = None
    interest_rate: Decimal | None = None
    minimum_payment: Decimal | None = None
    due_date: datetime | None = None
    status: str | None = None

class LiabilityOut(LiabilityBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
