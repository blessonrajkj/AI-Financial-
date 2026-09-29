from pydantic import BaseModel, ConfigDict
from decimal import Decimal
from datetime import date, datetime

class IndiaPostRateBase(BaseModel):
    scheme_code: str
    start_date: date
    end_date: date
    annual_rate: Decimal
    compounding_frequency: str = "Annual"

class IndiaPostRateCreate(IndiaPostRateBase):
    pass

class IndiaPostRateOut(IndiaPostRateBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
