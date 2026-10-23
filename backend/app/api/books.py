from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.acesso_livro import AcessoLivro
from app.models.autor import Autor
from app.models.avaliacao import Avaliacao
from app.models.genero import Genero
from app.models.item_lista import ItemLista
from app.models.livro import Livro
from app.models.livro_autor import LivroAutor
from app.models.livro_genero import LivroGenero
from app.models.nota_pessoal import NotaPessoal
from app.models.progresso_leitura import ProgressoLeitura
from app.models.user import User
from app.schemas.avaliacao import AvaliacaoCreate, AvaliacaoPublic
from app.schemas.item_lista import ItemListaCreate, ItemListaPublic
from app.schemas.livro import LivroCreate, LivroPublic, LivroUpdate
from app.schemas.nota_pessoal import NotaPessoalCreate, NotaPessoalPublic, NotaPessoalUpdate
from app.schemas.progresso_leitura import ProgressoLeituraPublic, ProgressoLeituraUpdate

router = APIRouter(prefix="/books", tags=["books"])
reviews_router = APIRouter(prefix="/reviews", tags=["reviews"])
notes_router = APIRouter(prefix="/notes", tags=["notes"])
users_router = APIRouter(prefix="/users/me", tags=["users"])


def get_public_book(db: Session, book_id: int) -> Livro:
    book = db.scalar(
        select(Livro).where(
            Livro.id_livro == book_id,
            Livro.status_publicacao == "publicado",
            Livro.status_bloqueado.is_(False),
        )
    )
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


def book_response(book: Livro) -> dict:
    result = LivroPublic.model_validate(book).model_dump()
    result["rating"] = result.pop("nota_media", 0) if "nota_media" in result else 0
    return result


@router.get("", response_model=list[LivroPublic])
def search_books(
    title: str | None = None,
    author: str | None = None,
    genre: str | None = None,
    publication_date: date | None = None,
    sort: str | None = Query(default=None, pattern="^(popularity|rating)$"),
    db: Session = Depends(get_db),
) -> list[Livro]:
    query = select(Livro).where(
        Livro.status_publicacao == "publicado",
        Livro.status_bloqueado.is_(False),
    )
    if title:
        query = query.where(Livro.titulo.ilike(f"%{title}%"))
    if publication_date:
        query = query.where(Livro.data_publicacao == publication_date)
    if author:
        query = query.join(LivroAutor, LivroAutor.id_livro == Livro.id_livro).join(Autor, Autor.id_autor == LivroAutor.id_autor).where(Autor.nome.ilike(f"%{author}%"))
    if genre:
        query = query.join(LivroGenero, LivroGenero.id_livro == Livro.id_livro).join(Genero, Genero.id_genero == LivroGenero.id_genero).where(Genero.nome.ilike(f"%{genre}%"))
    if author or genre:
        query = query.distinct()
    if sort == "popularity":
        query = query.order_by(Livro.criado_em.desc())
    else:
        query = query.order_by(Livro.data_publicacao.desc())
    return list(db.scalars(query).all())


@router.get("/{book_id}", response_model=LivroPublic)
def get_book(book_id: int, db: Session = Depends(get_db)) -> Livro:
    return get_public_book(db, book_id)


@router.post("", response_model=LivroPublic, status_code=status.HTTP_201_CREATED)
def publish_book(
    payload: LivroCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Livro:
    if user.is_blocked:
        raise HTTPException(status_code=403, detail="User is blocked")
    book = Livro(
        titulo=payload.titulo,
        descricao=payload.descricao,
        data_publicacao=payload.data_publicacao,
        arquivo_conteudo=payload.arquivo_conteudo,
        total_paginas=payload.total_paginas,
        origem="usuario",
        status_publicacao="publicado",
        id_publicador=user.id,
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.get("/{book_id}/read", response_model=LivroPublic)
def read_book(
    book_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Livro:
    book = get_public_book(db, book_id)
    db.add(AcessoLivro(id_livro=book.id_livro, id_usuario=user.id))
    db.commit()
    return book


@router.get("/{book_id}/reviews", response_model=list[AvaliacaoPublic])
def get_reviews(book_id: int, db: Session = Depends(get_db)) -> list[Avaliacao]:
    get_public_book(db, book_id)
    return list(db.scalars(select(Avaliacao).where(Avaliacao.id_livro == book_id, Avaliacao.is_removida.is_(False))).all())


@router.post("/{book_id}/reviews", response_model=AvaliacaoPublic, status_code=status.HTTP_201_CREATED)
def create_review(
    book_id: int,
    payload: AvaliacaoCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Avaliacao:
    get_public_book(db, book_id)
    review = Avaliacao(id_usuario=user.id, id_livro=book_id, nota=payload.nota, texto_revisao=payload.texto_revisao)
    db.add(review)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="You have already reviewed this book") from error
    db.refresh(review)
    return review


@reviews_router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    review = db.get(Avaliacao, review_id)
    if review is None or review.is_removida:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.id_usuario != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="You cannot delete this review")
    review.is_removida = True
    db.commit()
    return {"message": "Review deleted"}


@users_router.get("/favorites", response_model=list[ItemListaPublic])
def get_favorites(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[ItemLista]:
    return list(db.scalars(select(ItemLista).where(ItemLista.id_usuario == user.id, ItemLista.tipo == "favorito")).all())


@users_router.get("/to-read", response_model=list[ItemListaPublic])
def get_to_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[ItemLista]:
    return list(db.scalars(select(ItemLista).where(ItemLista.id_usuario == user.id, ItemLista.tipo == "ler_depois")).all())


@users_router.post("/lists", response_model=ItemListaPublic, status_code=status.HTTP_201_CREATED)
def add_to_list(
    payload: ItemListaCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ItemLista:
    get_public_book(db, payload.id_livro)
    item = ItemLista(id_usuario=user.id, id_livro=payload.id_livro, tipo=payload.tipo)
    db.add(item)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Book is already in this list") from error
    db.refresh(item)
    return item


@users_router.delete("/lists/{book_id}/{list_type}")
def remove_from_list(
    book_id: int,
    list_type: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    if list_type not in {"favorito", "ler_depois"}:
        raise HTTPException(status_code=422, detail="Invalid list type")
    result = db.execute(delete(ItemLista).where(ItemLista.id_usuario == user.id, ItemLista.id_livro == book_id, ItemLista.tipo == list_type))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="List item not found")
    db.commit()
    return {"message": "Book removed from list"}


@users_router.get("/notes", response_model=list[NotaPessoalPublic])
def get_notes(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[NotaPessoal]:
    return list(db.scalars(select(NotaPessoal).where(NotaPessoal.id_usuario == user.id)).all())


@users_router.post("/notes", response_model=NotaPessoalPublic, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NotaPessoalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NotaPessoal:
    get_public_book(db, payload.id_livro)
    note = NotaPessoal(id_usuario=user.id, **payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@notes_router.patch("/{note_id}", response_model=NotaPessoalPublic)
def update_note(
    note_id: int,
    payload: NotaPessoalUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NotaPessoal:
    note = db.scalar(select(NotaPessoal).where(NotaPessoal.id_nota == note_id, NotaPessoal.id_usuario == user.id))
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(note, key, value)
    db.commit()
    db.refresh(note)
    return note


@notes_router.delete("/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    note = db.scalar(select(NotaPessoal).where(NotaPessoal.id_nota == note_id, NotaPessoal.id_usuario == user.id))
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}


@router.get("/{book_id}/progress", response_model=ProgressoLeituraPublic)
def get_progress(book_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ProgressoLeitura:
    progress = db.scalar(select(ProgressoLeitura).where(ProgressoLeitura.id_livro == book_id, ProgressoLeitura.id_usuario == user.id))
    if progress is None:
        raise HTTPException(status_code=404, detail="Reading progress not found")
    return progress


@router.patch("/{book_id}/progress", response_model=ProgressoLeituraPublic)
def update_progress(
    book_id: int,
    payload: ProgressoLeituraUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProgressoLeitura:
    book = get_public_book(db, book_id)
    progress = db.scalar(select(ProgressoLeitura).where(ProgressoLeitura.id_livro == book_id, ProgressoLeitura.id_usuario == user.id))
    if progress is None:
        progress = ProgressoLeitura(id_livro=book_id, id_usuario=user.id)
        db.add(progress)
    values = payload.model_dump(exclude_unset=True)
    if "paginas_distintas_lidas" in values and values["paginas_distintas_lidas"] > book.total_paginas:
        raise HTTPException(status_code=422, detail="Pages read cannot exceed the book page count")
    for key, value in values.items():
        setattr(progress, key, value)
    db.commit()
    db.refresh(progress)
    return progress
