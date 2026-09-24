from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings for auth-service"""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # API
    app_name: str = "auth-service"
    app_version: str = "1.1.0"
    api_prefix: str = "/api"

    # Security
    secret_key: str = "change-me-in-production"
    internal_api_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Database
    database_url: str

    # Email SMTP Settings
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_tls: bool = True
    frontend_url: str = "http://127.0.0.1:4321"

    # Proyecto Firebase (Agrobamba). Solo se usa para verificar ID tokens.
    firebase_project_id: str = "agrobamba-cia-ltda"

    debug: bool = False


settings = Settings()
