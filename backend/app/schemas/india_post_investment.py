from pydantic import BaseModel
from datetime import datetime

class IndiaPostInvestmentBase(BaseModel):
    scheme_name: str
    amount: float
    interest_rate: float
    investment_date: datetime
    maturity_date: datetime
    frequency: str  # One Time, Monthly
    nominee: str | None = None
    account_number: str | None = None
    branch_name: str | None = None
    notes: str | None = None
    status: str = "Active"

class IndiaPostInvestmentCreate(IndiaPostInvestmentBase):
    pass

class IndiaPostInvestmentUpdate(BaseModel):
    scheme_name: str | None = None
    amount: float | None = None
    interest_rate: float | None = None
    investment_date: datetime | None = None
    maturity_date: datetime | None = None
    frequency: str | None = None
    nominee: str | None = None
    account_number: str | None = None
    branch_name: str | None = None
    notes: str | None = None
    status: str | None = None

class IndiaPostInvestmentOut(IndiaPostInvestmentBase):
    id: int
    user_id: int
    category: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
