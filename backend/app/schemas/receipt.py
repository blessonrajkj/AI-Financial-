from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Any

class ReceiptBase(BaseModel):
    file_path: str
    merchant_name: str | None = None
    total_amount: float | None = None
    tax_amount: float | None = None
    transaction_date: datetime | None = None
    extracted_data: Any | None = None
    status: str = "pending"

class ReceiptCreate(ReceiptBase):
    pass

class ReceiptOut(ReceiptBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
