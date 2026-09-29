from pydantic import BaseModel, ConfigDict
from datetime import datetime

class CategoryFeedbackCreate(BaseModel):
    transaction_id: int | None = None
    raw_narration: str
    old_category: str | None = None
    new_category: str

class CategoryFeedbackOut(BaseModel):
    id: int
    user_id: int
    transaction_id: int | None = None
    raw_narration: str
    old_category: str | None = None
    new_category: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
