from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditCreate(BaseModel):
    user_id: str
    action: str
    endpoint: str | None = None
    ip_address: str | None = None


class AuditLogOut(BaseModel):
    id: str
    user_id: str
    action: str
    endpoint: str | None = None
    ip_address: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionValidate(BaseModel):
    user_id: str
    session_token: str | None = None


class SessionValidateOut(BaseModel):
    valid: bool = True
    user_id: str
    role: str
    status: str
