from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import datetime

class TransferCreate(BaseModel):
    source_account_id: int
    destination_account_id: int
    amount: Decimal
    fee: Decimal = Decimal('0.00')
    transfer_date: datetime | None = None
    reference_number: str | None = None
    notes: str | None = None

class TransferOut(BaseModel):
    id: int
    user_id: int
    source_account_id: int
    destination_account_id: int
    amount: Decimal
    fee: Decimal | None = Decimal('0.00')
    transfer_date: datetime
    reference_number: str | None = None
    notes: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
