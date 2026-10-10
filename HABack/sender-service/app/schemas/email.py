from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator


class WelcomeRequest(BaseModel):
    """Payload para correo de bienvenida post-registro."""

    to_email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=120)
    last_name: str = Field(default="", max_length=120)
    login_url: HttpUrl | None = None

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_names(cls, value: str) -> str:
        return value.strip()


class VerifyEmailRequest(BaseModel):
    to_email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=120)
    verification_token: str = Field(..., min_length=8, max_length=2048)
    verification_url: HttpUrl | None = None

    @field_validator("first_name", "verification_token")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("no puede estar vacío")
        return cleaned


class ResetPasswordRequest(BaseModel):
    to_email: EmailStr
    first_name: str = Field(default="Usuario", max_length=120)
    reset_token: str = Field(..., min_length=8, max_length=2048)
    reset_url: HttpUrl | None = None
    expires_minutes: int = Field(default=10, ge=1, le=1440)

    @field_validator("first_name", "reset_token")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("no puede estar vacío")
        return cleaned


class ProcessVerifiedRequest(BaseModel):
    """Notificación tras anclar un proceso en Polygon (llamado por bcregister)."""

    to_email: EmailStr
    process_id: str = Field(..., min_length=1, max_length=128)
    content_hash: str = Field(..., min_length=64, max_length=64)
    tx_hash: str | None = Field(default=None, max_length=128)
    explorer_url: HttpUrl | None = None

    @field_validator("process_id", "content_hash")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("no puede estar vacío")
        return cleaned


class EmailSendResponse(BaseModel):
    ok: bool = True
    message: str
    provider_id: str | None = None
    template: str
