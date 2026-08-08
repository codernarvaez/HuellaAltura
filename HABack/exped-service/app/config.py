from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "exped-service"
    app_version: str = "2.1.0"
    debug: bool = False

    database_url: str = "file:./geoguard.db"

    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"

    auth_service_url: str = ""
    internal_api_key: str = "change-me-in-production"
    session_validation_enabled: bool = True

    # Orígenes permitidos por CORS, separados por comas.
    cors_origins: str = "http://localhost:4321,http://localhost:4322,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
