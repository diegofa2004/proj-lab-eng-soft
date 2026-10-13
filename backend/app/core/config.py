import json
import os
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "LivrUSP API"
    DATABASE_URL: str = "sqlite:///./data.db"
    JWT_SECRET_KEY: str = "development-secret-key-at-least-32-bytes"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    BACKEND_CORS_ORIGINS: list[str] | str = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if not isinstance(value, str):
            return value

        origin_value = value.strip()
        if origin_value.startswith("["):
            try:
                return json.loads(origin_value)
            except json.JSONDecodeError:
                pass
        if "," in origin_value:
            return [origin.strip() for origin in origin_value.split(",") if origin.strip()]
        return [origin_value] if origin_value else ["*"]


def _resolve_database_url() -> str:
    return os.environ.get("DATABASE_URL") or os.environ.get("SQLALCHEMY_DATABASE_URI") or "sqlite:///./data.db"


@lru_cache
def get_settings() -> Settings:
    return Settings(DATABASE_URL=_resolve_database_url())


settings = get_settings()
