from pydantic import BaseModel
from datetime import datetime

class CategoryOut(BaseModel):
    id: int
    name: str
    type: str

    class Config:
        from_attributes = True

class MerchantOut(BaseModel):
    id: int
    name: str
    default_category_id: int | None = None

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    amount: float
    date: datetime
    description: str | None = None
    category_id: int | None = None
    merchant_id: int | None = None
    payment_method: str = "Cash"
    type: str = "expense"
    is_recurring: bool = False
    receipt_id: int | None = None
    voice_log_id: int | None = None
    tags: str | None = None
    transaction_id: str | None = None
    reference_number: str | None = None
    bank: str | None = None
    balance: float | None = None
    debit_amount: float | None = None
    credit_amount: float | None = None
    post_date: str | None = None
    time: str | None = None
    subcategory: str | None = "Uncategorized"

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: float | None = None
    date: datetime | None = None
    description: str | None = None
    category_id: int | None = None
    merchant_id: int | None = None
    payment_method: str | None = None
    type: str | None = None
    is_recurring: bool | None = None
    tags: str | None = None
    transaction_id: str | None = None
    reference_number: str | None = None
    bank: str | None = None
    balance: float | None = None
    debit_amount: float | None = None
    credit_amount: float | None = None
    post_date: str | None = None
    time: str | None = None
    subcategory: str | None = None

class TransactionOut(TransactionBase):
    id: int
    created_at: datetime
    category: CategoryOut | None = None
    merchant: MerchantOut | None = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class BulkTransactionItem(BaseModel):
    date: str
    amount: float
    type: str = "expense"
    direction: str | None = None
    merchant: str | None = None
    category: str | None = None
    subcategory: str | None = None
    description: str | None = None
    payment_method: str | None = "Cash"
    transaction_id: str | None = None
    reference_number: str | None = None
    bank: str | None = None
    balance: float | None = None
    debit_amount: float | None = None
    credit_amount: float | None = None
    post_date: str | None = None
    time: str | None = None
    source_type: str | None = None
    source_file_name: str | None = None
    needs_review: bool | None = False
    review_reason: str | None = None
    is_duplicate: bool | None = False
    upi_id: str | None = None
    origIdx: int | None = None

    class Config:
        extra = "ignore"

class BulkValidateRequest(BaseModel):
    transactions: list[BulkTransactionItem]

class BulkImportRequest(BaseModel):
    transactions: list[BulkTransactionItem]
    duplicate_strategy: str # "skip", "replace", "keep"
