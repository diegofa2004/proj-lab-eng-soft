from typing import Any

from fastapi import Header, HTTPException

from app.db.memory import store


def current_user(x_user_id: int = Header(default=1, alias="X-User-Id")) -> dict[str, Any]:
    user = store.users.get(x_user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user["blocked"]:
        raise HTTPException(status_code=403, detail="User is blocked")
    return user


def require_admin(user: dict[str, Any]) -> None:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Administrator privileges required")
