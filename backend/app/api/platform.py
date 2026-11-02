from typing import Annotated

from fastapi import Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.base import Livro, User
from app.db.session import get_db

DB = Annotated[Session, Depends(get_db)]
Reader = Annotated[User, Depends(get_current_user)]
Limit = Annotated[int, Query(ge=1, le=100)]
Offset = Annotated[int, Query(ge=0)]


def require_admin(user: Reader) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Administrator required")
    return user


Admin = Annotated[User, Depends(require_admin)]


def require(row):
    if row is None:
        raise HTTPException(404, "Not found")
    return row


def save(db, row):
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Conflicting or invalid record") from exc
    db.refresh(row)
    return row


def public_book(db, book_id):
    return require(
        db.scalar(
            select(Livro).filter_by(
                id_livro=book_id, status_publicacao="publicado", status_bloqueado=False
            )
        )
    )


def lock_reader(db, user):
    db.scalar(select(User).where(User.id == user.id).with_for_update())


def profile_stats(db, user):
    return (
        db.execute(
            text("SELECT * FROM plataforma.v_perfil_usuario WHERE id_usuario=:uid"),
            {"uid": user.id},
        )
        .mappings()
        .one()
    )
