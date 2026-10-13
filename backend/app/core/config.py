from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "LivrUSP API"
    app_version: str = "0.1.0"
    cors_origins: list[str] = ["http://localhost:3000"]
    in_memory_mode: bool = True


settings = Settings()
