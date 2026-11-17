from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.endpoints.catalog import (
    CONTENT,
    book_chapter_sources,
    generate_book_epub,
    grant_publish,
    owned_book,
)
from app.api.platform import DB, Reader, profile_stats, require, save
from app.db.base import Autor, Capitulo, Genero, Livro, LivroAutor, LivroGenero
from app.models.user import User
from app.schemas.capitulo import (
    CapituloCreate,
    CapituloPublic,
    CapituloReorder,
    CapituloUpdate,
    OwnedBookDetail,
    OwnedBookSummary,
)
from app.schemas.epub import EpubPreview
from app.writing import MAX_CHAPTERS, book_metrics, summary_payload

router = APIRouter(tags=["Writing"])

EDITABLE_STATUSES = {"rascunho", "arquivado"}
CONTENT_DIR = Path(CONTENT)


def _require_editable(book: Livro) -> None:
    if book.status_publicacao not in EDITABLE_STATUSES:
        raise HTTPException(409, "Published books cannot be edited")


def _lock_book(db: Session, book: Livro) -> None:
    db.scalar(select(Livro).where(Livro.id_livro == book.id_livro).with_for_update())


def _book_chapters(db: Session, book_id: int) -> list[Capitulo]:
    return list(
        db.scalars(
            select(Capitulo).where(Capitulo.id_livro == book_id).order_by(Capitulo.ordem)
        )
    )


def _book_detail(db: Session, book: Livro, user: User) -> dict:
    metrics = book_metrics(db, [book])[book.id_livro]
    return {
        **summary_payload(
            book,
            metrics,
            bool(user.is_admin or profile_stats(db, user)["pode_publicar"]),
            CONTENT_DIR,
        ),
        "autores": db.scalars(
            select(Autor)
            .join(LivroAutor, LivroAutor.id_autor == Autor.id_autor)
            .where(LivroAutor.id_livro == book.id_livro)
            .order_by(Autor.nome)
        ).all(),
        "generos": db.scalars(
            select(Genero)
            .join(LivroGenero, LivroGenero.id_genero == Genero.id_genero)
            .where(LivroGenero.id_livro == book.id_livro)
            .order_by(Genero.nome)
        ).all(),
        "capitulos": _book_chapters(db, book.id_livro),
    }


@router.get("/me/books", response_model=list[OwnedBookSummary])
def my_books(db: DB, user: Reader):
    books = list(
        db.scalars(select(Livro).filter_by(id_publicador=user.id).order_by(Livro.id_livro.desc()))
    )
    metrics = book_metrics(db, books)
    can_publish = bool(user.is_admin or profile_stats(db, user)["pode_publicar"])
    return [
        summary_payload(book, metrics[book.id_livro], can_publish, CONTENT_DIR) for book in books
    ]


@router.get("/me/books/{book_id}", response_model=OwnedBookDetail)
def owned_book_detail(book_id: int, db: DB, user: Reader):
    return _book_detail(db, owned_book(db, user, book_id), user)


@router.post("/books/{book_id}/epub", response_model=EpubPreview)
def preview_epub(book_id: int, db: DB, user: Reader):
    grant_publish(db, user)
    book = owned_book(db, user, book_id)
    chapters = book_chapter_sources(db, book_id)
    if not chapters:
        raise HTTPException(422, "Write at least one chapter before generating an EPUB")
    result = generate_book_epub(db, book, chapters)
    return {
        "total_palavras": result.total_palavras,
        "total_paginas": result.total_paginas,
    }


@router.post(
    "/books/{book_id}/chapters", response_model=CapituloPublic, status_code=201
)
def create_chapter(book_id: int, data: CapituloCreate, db: DB, user: Reader):
    grant_publish(db, user)
    book = owned_book(db, user, book_id)
    _require_editable(book)
    _lock_book(db, book)

    total = db.scalar(
        select(func.count()).select_from(Capitulo).where(Capitulo.id_livro == book_id)
    )
    if total is not None and total >= MAX_CHAPTERS:
        raise HTTPException(422, f"A book can have at most {MAX_CHAPTERS} chapters")
    last_order = (
        db.scalar(select(func.max(Capitulo.ordem)).where(Capitulo.id_livro == book_id)) or 0
    )
    chapter = Capitulo(
        id_livro=book_id,
        ordem=last_order + 1,
        titulo=data.titulo,
        conteudo=data.conteudo,
    )
    return save(db, chapter)


@router.patch(
    "/books/{book_id}/chapters/{chapter_id}", response_model=CapituloPublic
)
def update_chapter(
    book_id: int, chapter_id: int, data: CapituloUpdate, db: DB, user: Reader
):
    grant_publish(db, user)
    book = owned_book(db, user, book_id)
    _require_editable(book)
    chapter = require(
        db.scalar(
            select(Capitulo).where(
                Capitulo.id_capitulo == chapter_id, Capitulo.id_livro == book_id
            )
        )
    )
    _lock_book(db, book)
    if data.versao != chapter.versao:
        raise HTTPException(409, "Chapter was updated by another session")

    for key, value in data.model_dump(exclude_unset=True, exclude={"versao"}).items():
        setattr(chapter, key, value)
    chapter.versao += 1
    chapter.atualizado_em = datetime.now(UTC)
    return save(db, chapter)


@router.delete("/books/{book_id}/chapters/{chapter_id}", status_code=204)
def delete_chapter(book_id: int, chapter_id: int, db: DB, user: Reader):
    grant_publish(db, user)
    book = owned_book(db, user, book_id)
    _require_editable(book)
    chapter = require(
        db.scalar(
            select(Capitulo).where(
                Capitulo.id_capitulo == chapter_id, Capitulo.id_livro == book_id
            )
        )
    )
    _lock_book(db, book)
    removed_order = chapter.ordem
    db.delete(chapter)
    db.flush()
    db.execute(
        update(Capitulo)
        .where(Capitulo.id_livro == book_id, Capitulo.ordem > removed_order)
        .values(ordem=Capitulo.ordem - 1)
    )
    db.commit()


@router.put("/books/{book_id}/chapters/reorder", response_model=list[CapituloPublic])
def reorder_chapters(book_id: int, data: CapituloReorder, db: DB, user: Reader):
    grant_publish(db, user)
    book = owned_book(db, user, book_id)
    _require_editable(book)
    _lock_book(db, book)

    chapters = _book_chapters(db, book_id)
    expected = {chapter.id_capitulo for chapter in chapters}
    if len(data.capitulos) != len(expected) or set(data.capitulos) != expected:
        raise HTTPException(422, "Reorder must contain exactly the book chapter ids")

    offset = (max((chapter.ordem for chapter in chapters), default=0)) + 1000
    for index, chapter in enumerate(chapters):
        chapter.ordem = offset + index
    db.flush()

    by_id = {chapter.id_capitulo: chapter for chapter in chapters}
    for index, chapter_id in enumerate(data.capitulos, start=1):
        by_id[chapter_id].ordem = index
    db.commit()
    return sorted(chapters, key=lambda chapter: chapter.ordem)
