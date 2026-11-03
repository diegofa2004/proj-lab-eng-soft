import json
import os
from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "LivrUSP API"
    DATABASE_URL: str = Field(
        validation_alias=AliasChoices("DATABASE_URL", "SQLALCHEMY_DATABASE_URI")
    )
    JWT_SECRET_KEY: str
    DEMO_BILLING: bool = False

    @field_validator("JWT_SECRET_KEY", mode="before")
    @classmethod
    def load_key_from_file(cls, key: str) -> str:
        path = os.environ.get("JWT_SECRET_KEY_FILE")
        if not key and path:
            return Path(path).read_text().strip()
        return key

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_key(cls, key: str) -> str:
        if len(key.encode()) < 32 or key in {
            "replace-with-a-random-secret-of-at-least-32-characters",
            "development-secret-key-at-least-32-bytes",
        }:
            raise ValueError("Configure a private JWT secret of at least 32 bytes")
        return key

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    BACKEND_CORS_ORIGINS: list[str] | str = ["http://localhost:5173", "http://localhost:3000"]

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
        return (
            [origin_value] if origin_value else ["http://localhost:5173", "http://localhost:3000"]
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
