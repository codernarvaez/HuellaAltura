from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class AuditCreate(BaseModel):
    user_id: str
    action: str
    endpoint: Optional[str] = None
    ip_address: Optional[str] = None


class AuditLogOut(BaseModel):
    id: str
    user_id: str
    action: str
    endpoint: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionValidate(BaseModel):
    user_id: str
    session_token: Optional[str] = None


class SessionValidateOut(BaseModel):
    valid: bool = True
    user_id: str
    role: str
    status: str
