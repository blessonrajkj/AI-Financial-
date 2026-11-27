from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from app.schemas.transaction import CategoryOut

class BudgetBase(BaseModel):
    category_id: int
    amount: float
    month: int = Field(..., ge=1, le=12)
    year: int

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category_id: int | None = None
    amount: float | None = None
    month: int | None = Field(None, ge=1, le=12)
    year: int | None = None

class BudgetOut(BudgetBase):
    id: int
    created_at: datetime
    category: CategoryOut | None = None

    model_config = ConfigDict(from_attributes=True)
