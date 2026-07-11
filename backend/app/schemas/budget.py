from pydantic import BaseModel
from datetime import datetime
from app.schemas.transaction import CategoryOut

class BudgetBase(BaseModel):
    category_id: int
    amount: float
    month: int
    year: int

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category_id: int | None = None
    amount: float | None = None
    month: int | None = None
    year: int | None = None

class BudgetOut(BudgetBase):
    id: int
    created_at: datetime
    category: CategoryOut | None = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
