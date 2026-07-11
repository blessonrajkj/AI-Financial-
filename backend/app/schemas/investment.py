from pydantic import BaseModel
from datetime import datetime

class InvestmentBase(BaseModel):
    asset_name: str
    asset_type: str  # Stock, Mutual Fund, SIP, ETF, Gold, Crypto, Fixed Deposit, Bond, PPF, NPS
    quantity: float
    purchase_price: float
    current_price: float
    purchase_date: datetime | None = None
    dividends_received: float = 0.0

class InvestmentCreate(InvestmentBase):
    pass

class InvestmentUpdate(BaseModel):
    asset_name: str | None = None
    asset_type: str | None = None
    quantity: float | None = None
    purchase_price: float | None = None
    current_price: float | None = None
    purchase_date: datetime | None = None
    dividends_received: float | None = None

class InvestmentOut(InvestmentBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
