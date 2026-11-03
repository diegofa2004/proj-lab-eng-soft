from datetime import UTC, datetime

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.movimento_pontos import MovimentoPontos
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def record_activity(db: Session, user: User) -> None:
    """Record a real authenticated visit and charge only elapsed inactive days."""
    today = datetime.now(UTC).date()
    if user.last_activity.date() >= today:
        return
    user = db.scalar(
        select(User)
        .where(User.id == user.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if user.last_activity.date() >= today:
        return
    inactive_days = max(0, (today - user.last_activity.date()).days - 1)
    if inactive_days:
        db.add(
            MovimentoPontos(
                id_usuario=user.id,
                quantidade=-inactive_days,
                motivo="inatividade",
                data_referencia=today,
                chave_evento=f"inactivity:{user.id}:{today.isoformat()}",
            )
        )
    user.last_activity = datetime.now(UTC)
    db.commit()


def unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise unauthorized("Not authenticated.")

    try:
        payload = decode_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise unauthorized("Session has expired.")
    except jwt.PyJWTError:
        raise unauthorized("Invalid session.")

    if payload.get("type") != "access":
        raise unauthorized("Invalid session.")

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise unauthorized("Invalid session.")

    user = db.get(User, user_id)
    if user is None:
        raise unauthorized("Invalid session.")
    if user.is_blocked:
        raise HTTPException(403, "Account blocked.")
    record_activity(db, user)
    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin or current_user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Administrator privileges required."
        )
    return current_user


def optional_reader(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    return get_current_user(credentials, db) if credentials else None
