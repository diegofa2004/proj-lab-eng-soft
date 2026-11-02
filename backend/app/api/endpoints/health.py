from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.api.platform import DB
from app.models.user import User

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: DB) -> dict[str, str]:
    try:
        db.execute(select(User.id).limit(1))
    except SQLAlchemyError as exc:
        raise HTTPException(503, "Database schema unavailable") from exc
    return {"status": "ok"}
