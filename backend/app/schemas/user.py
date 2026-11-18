from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class PasswordInput(BaseModel):
    @field_validator("password", check_fields=False)
    @classmethod
    def validate_bytes(cls, value: str) -> str:
        if len(value.encode()) > 72:
            raise ValueError("Password exceeds 72 UTF-8 bytes")
        return value


class UserCreate(PasswordInput):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=8, max_length=72)
    birth_date: date

    @field_validator("username", mode="before")
    @classmethod
    def strip_username(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: date) -> date:
        today = date.today()
        if value > today:
            raise ValueError("Birth date cannot be in the future")
        if value.year < today.year - 120:
            raise ValueError("Please enter a valid birth date")
        return value


class UserLogin(PasswordInput):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=72)

    @field_validator("username", mode="before")
    @classmethod
    def strip_username(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    is_admin: bool


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
