"""Pydantic schemas for user input and public API responses."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    """Validated data accepted when a user creates an account."""

    username: str = Field(min_length=3, max_length=50)
    email: EmailStr = Field(max_length=320)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def strip_username(cls, value: object) -> object:
        """Avoid accepting an otherwise valid username padded with spaces."""
        return value.strip() if isinstance(value, str) else value


class UserLogin(BaseModel):
    """Validated credentials accepted when a user signs in."""

    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def strip_username(cls, value: object) -> object:
        """Use the same username normalization as account creation."""
        return value.strip() if isinstance(value, str) else value


class UserPublic(BaseModel):
    """User data safe to return from the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
