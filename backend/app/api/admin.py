from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.session import get_db
from app.models.acesso_livro import AcessoLivro
from app.models.assinatura import Assinatura
from app.models.avaliacao import Avaliacao
from app.models.atividade_admin import AtividadeAdmin
from app.models.livro import Livro
from app.models.user import User
from app.schemas.livro import LivroPublic, LivroUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


def get_book(db: Session, book_id: int) -> Livro:
    book = db.get(Livro, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.patch("/books/{book_id}", response_model=LivroPublic)
def update_book(book_id: int, payload: LivroUpdate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> Livro:
    book = get_book(db, book_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(book, key, value)
    db.add(AtividadeAdmin(id_admin=admin.id, id_livro_alvo=book_id, tipo_acao="editar_livro", descricao="Book metadata updated"))
    db.commit()
    db.refresh(book)
    return book


@router.post("/books/{book_id}/block")
def block_book(book_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> dict[str, str]:
    book = get_book(db, book_id)
    book.status_bloqueado = True
    db.add(AtividadeAdmin(id_admin=admin.id, id_livro_alvo=book_id, tipo_acao="bloquear_livro", descricao="Book blocked"))
    db.commit()
    return {"message": "Book blocked"}


@router.post("/books/{book_id}/unblock")
def unblock_book(book_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> dict[str, str]:
    book = get_book(db, book_id)
    book.status_bloqueado = False
    db.add(AtividadeAdmin(id_admin=admin.id, id_livro_alvo=book_id, tipo_acao="desbloquear_livro", descricao="Book unblocked"))
    db.commit()
    return {"message": "Book unblocked"}


@router.post("/users/{user_id}/block")
def block_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> dict[str, str]:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_blocked = True
    db.add(AtividadeAdmin(id_admin=admin.id, id_usuario_alvo=user_id, tipo_acao="bloquear_usuario", descricao="User blocked"))
    db.commit()
    return {"message": "User blocked"}


@router.post("/users/{user_id}/unblock")
def unblock_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> dict[str, str]:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_blocked = False
    db.add(AtividadeAdmin(id_admin=admin.id, id_usuario_alvo=user_id, tipo_acao="desbloquear_usuario", descricao="User unblocked"))
    db.commit()
    return {"message": "User unblocked"}


@router.delete("/reviews/{review_id}")
def moderate_review(review_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> dict[str, str]:
    review = db.get(Avaliacao, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_removida = True
    db.add(AtividadeAdmin(id_admin=admin.id, id_avaliacao_alvo=review_id, tipo_acao="moderar_avaliacao", descricao="Review removed by moderation"))
    db.commit()
    return {"message": "Review removed"}


@router.get("/activities")
def activities(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> list[AtividadeAdmin]:
    return list(db.scalars(select(AtividadeAdmin).order_by(AtividadeAdmin.data_hora.desc())).all())


@router.get("/stats")
def stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)) -> dict:
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    blocked_users = db.scalar(select(func.count()).select_from(User).where(User.is_blocked.is_(True))) or 0
    return {"users": {"total": total_users, "active": total_users - blocked_users, "blocked": blocked_users}, "books": db.scalar(select(func.count()).select_from(Livro)) or 0, "accesses": db.scalar(select(func.count()).select_from(AcessoLivro)) or 0, "reviews": db.scalar(select(func.count()).select_from(Avaliacao).where(Avaliacao.is_removida.is_(False))) or 0}