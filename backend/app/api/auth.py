from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import current_user
from app.db.memory import store
from app.schemas.auth import LoginRequest, ProfileUpdate, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest) -> dict[str, Any]:
    if any(user["email"] == payload.email for user in store.users.values()):
        raise HTTPException(status_code=409, detail="This email is already in use")
    user_id = store.next_ids["user"]
    store.next_ids["user"] += 1
    store.users[user_id] = {"id": user_id, "username": payload.username, "email": payload.email, "password": payload.password, "role": "reader", "points": 0, "premium": False, "avatar": "default-reader", "blocked": False}
    return {"user": store.public_user(store.users[user_id]), "user_id": user_id}


@router.post("/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    user = next((item for item in store.users.values() if item["email"] == payload.email), None)
    if user is None or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user["blocked"]:
        raise HTTPException(status_code=403, detail="User is blocked")
    return {"token": f"demo-token-{user['id']}", "user": store.public_user(user)}


@users_router.get("/me")
def get_me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return store.public_user(user)


@users_router.patch("/me")
def update_profile(payload: ProfileUpdate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if payload.username is not None:
        user["username"] = payload.username
    if payload.avatar is not None:
        user["avatar"] = payload.avatar
    return store.public_user(user)
