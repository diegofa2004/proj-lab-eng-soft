from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3)
    email: str = Field(min_length=3)
    password: str = Field(min_length=4)


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3)
    avatar: str | None = None


class SubscriptionRequest(BaseModel):
    plan: str = Field(pattern="^premium$")


class InactivityRequest(BaseModel):
    days: int = Field(gt=0)


class AssetUpdate(BaseModel):
    asset: str = Field(min_length=1)
