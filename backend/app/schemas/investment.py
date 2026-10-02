from pydantic import BaseModel, ConfigDict
from datetime import datetime

class InvestmentBase(BaseModel):
    asset_name: str
    asset_type: str  # Stock, Mutual Fund, SIP, ETF, Gold, Crypto, Fixed Deposit, Bond, PPF, NPS
    symbol: str | None = None
    exchange: str | None = None
    quantity: float
    purchase_price: float
    current_price: float = 0.0
    purchase_date: datetime | None = None
    dividends_received: float = 0.0

class InvestmentCreate(InvestmentBase):
    pass

class InvestmentUpdate(BaseModel):
    asset_name: str | None = None
    asset_type: str | None = None
    symbol: str | None = None
    exchange: str | None = None
    quantity: float | None = None
    purchase_price: float | None = None
    current_price: float | None = None
    purchase_date: datetime | None = None
    dividends_received: float | None = None

class InvestmentOut(InvestmentBase):
    id: int
    user_id: int
    created_at: datetime
    previous_close: float | None = 0.0
    price_last_updated: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class InvestmentLotCreate(BaseModel):
    units: float
    price_per_unit: float
    transaction_date: datetime | None = None
    notes: str | None = None

class InvestmentTransactionOut(BaseModel):
    id: int | str
    investment_id: int
    user_id: int
    transaction_type: str  # BUY, SELL, DIVIDEND
    units: float
    price_per_unit: float
    total_amount: float
    transaction_date: datetime | None = None
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)
