from functools import lru_cache

from pydantic import EmailStr, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración validada del microservicio de correo."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "sender-service"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = False
    port: int = 8040
    api_prefix: str = "/api/v1"

    resend_api_key: str = Field(..., min_length=10, description="API key de Resend")
    resend_from_email: str = Field(
        ...,
        min_length=3,
        description="Remitente verificado, ej. Name <noreply@domain.com>",
    )
    resend_reply_to: EmailStr | None = None

    frontend_url: str = "http://127.0.0.1:4321"
    internal_api_key: str = Field(..., min_length=8)

    @field_validator("frontend_url")
    @classmethod
    def strip_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/")

    @field_validator("resend_api_key")
    @classmethod
    def strip_api_key(cls, value: str) -> str:
        return value.strip()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
