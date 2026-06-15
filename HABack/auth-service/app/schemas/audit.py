from typing import Optional
from pydantic import BaseModel

class AuditCreate(BaseModel):
    user_id: str
    action: str
    endpoint: Optional[str] = None
    ip_address: Optional[str] = None


class SessionValidate(BaseModel):
    user_id: str
    session_token: Optional[str] = None


class SessionValidateOut(BaseModel):
    valid: bool = True
    user_id: str
    role: str
    status: str
