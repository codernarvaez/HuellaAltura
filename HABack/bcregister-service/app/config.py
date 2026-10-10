from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración: Polygon + S2S a sender-service (sin Resend propio)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "bcregister-service"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = False
    port: int = 8050
    api_prefix: str = "/api/v1"

    internal_api_key: str = Field(..., min_length=8)

    # Correos vía sender-service (no Resend directo)
    sender_service_url: str = "http://127.0.0.1:8040"
    sender_timeout_seconds: float = 15.0

    polygon_rpc_url: str = Field(..., min_length=8)
    polygon_chain_id: int = 80002
    polygon_private_key: str = Field(..., min_length=64)
    polygon_contract_address: str | None = None
    polygon_confirmations: int = 1
    polygon_dry_run: bool = False

    @field_validator("sender_service_url")
    @classmethod
    def strip_sender_url(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @field_validator("polygon_private_key")
    @classmethod
    def normalize_private_key(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned.startswith("0x"):
            cleaned = f"0x{cleaned}"
        if len(cleaned) < 66:
            raise ValueError("POLYGON_PRIVATE_KEY debe ser una clave de 32 bytes (64 hex)")
        return cleaned

    @field_validator("polygon_contract_address")
    @classmethod
    def empty_contract_as_none(cls, value: str | None) -> str | None:
        if value is None or not str(value).strip():
            return None
        return str(value).strip()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
