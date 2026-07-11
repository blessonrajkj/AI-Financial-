from pydantic import BaseModel
from datetime import datetime

class SavingsGoalBase(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: datetime

class SavingsGoalCreate(SavingsGoalBase):
    pass

class SavingsGoalUpdate(BaseModel):
    name: str | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    target_date: datetime | None = None

class SavingsGoalOut(SavingsGoalBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
