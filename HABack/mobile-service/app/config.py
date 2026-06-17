from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings for mobile-service"""
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # API
    app_name: str = "mobile-service"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"

    # Services
    auth_service_url: str = "http://auth-service:8000"
    internal_api_key: str = "change-me-in-production"
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"

    debug: bool = False

settings = Settings()
