from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


class ProcessVerifyRequest(BaseModel):
    """Datos del proceso a anclar (el payload se hashea; no va a la chain)."""

    process_id: str = Field(..., min_length=1, max_length=128)
    payload: dict[str, Any] = Field(default_factory=dict)
    notify_email: EmailStr | None = None
    notify: bool = False

    @field_validator("process_id")
    @classmethod
    def strip_process_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("process_id no puede estar vacío")
        return cleaned


class ProcessVerifyAccepted(BaseModel):
    ok: bool = True
    status: str = "accepted"
    tracking_id: str
    process_id: str
    content_hash: str
    message: str = "Sellado encolado en Polygon"


class ProcessStatusResponse(BaseModel):
    tracking_id: str
    process_id: str
    content_hash: str
    status: str
    tx_hash: str | None = None
    error: str | None = None
