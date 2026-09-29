from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Any

class AuditLogOut(BaseModel):
    id: int
    user_id: int | None = None
    action: str
    resource_type: str
    resource_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    details: Any | None = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
