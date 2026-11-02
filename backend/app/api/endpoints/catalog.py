from datetime import date
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, text

from app.api.platform import DB, Limit, Offset, Reader, profile_stats, require, save
from app.core.deps import optional_reader
from app.db.base import AcessoLivro, AtividadeAdmin, Autor, Genero, Livro, LivroAutor, LivroGenero
from app.models.user import User
from app.schemas.autor import AutorPublic
from app.schemas.common import BookTitle, PositiveId
from app.schemas.genero import GeneroPublic
from app.schemas.livro import LivroPublic, StatusPublicacao

router = APIRouter(tags=["Catalog"])
CONTENT = Path("content")
MAX_BYTES = 20 * 1024 * 1024


class BookInput(BaseModel):
    titulo: BookTitle
    descricao: str = ""
    data_publicacao: date
    total_paginas: int = Field(gt=0)
    autores: list[PositiveId] = Field(default_factory=list)
    generos: list[PositiveId] = Field(default_factory=list)
    status_publicacao: StatusPublicacao = "rascunho"


class CatalogBook(LivroPublic):
    nota_media: float
    total_avaliacoes: int
    total_acessos: int


class Detail(CatalogBook):
    autores: list[AutorPublic]
    generos: list[GeneroPublic]


def links(db, book_id, model, through, key):
    return db.scalars(
        select(model)
        .join(through, getattr(model, key) == getattr(through, key))
        .where(through.id_livro == book_id)
        .order_by(model.nome)
    ).all()


@router.get("/books", response_model=list[CatalogBook])
def catalog(
    db: DB,
    q: str = "",
    genre: int | None = None,
    author: int | None = None,
    limit: Limit = 24,
    offset: Offset = 0,
):
    return (
        db.execute(
            text("""
        SELECT b.* FROM plataforma.v_catalogo_publico b
        WHERE (:q='' OR b.titulo ILIKE :pattern OR EXISTS (
            SELECT 1 FROM plataforma.livro_autor la JOIN plataforma.autor a USING(id_autor)
            WHERE la.id_livro=b.id_livro AND a.nome ILIKE :pattern))
        AND (CAST(:genre AS bigint) IS NULL OR EXISTS (SELECT 1 FROM plataforma.livro_genero g
             WHERE g.id_livro=b.id_livro AND g.id_genero=:genre))
        AND (CAST(:author AS bigint) IS NULL OR EXISTS (SELECT 1 FROM plataforma.livro_autor a
             WHERE a.id_livro=b.id_livro AND a.id_autor=:author))
        ORDER BY b.data_publicacao DESC,b.id_livro DESC LIMIT :lim OFFSET :off
    """),
            dict(q=q, pattern=f"%{q}%", genre=genre, author=author, lim=limit, off=offset),
        )
        .mappings()
        .all()
    )


@router.get("/books/{book_id}", response_model=Detail)
def detail(book_id: int, db: DB):
    book = require(
        db.execute(
            text("SELECT * FROM plataforma.v_catalogo_publico WHERE id_livro=:id"), {"id": book_id}
        )
        .mappings()
        .first()
    )
    return dict(
        book,
        autores=links(db, book_id, Autor, LivroAutor, "id_autor"),
        generos=links(db, book_id, Genero, LivroGenero, "id_genero"),
    )


@router.get("/me/books", response_model=list[LivroPublic])
def my_books(db: DB, user: Reader):
    return db.scalars(
        select(Livro).filter_by(id_publicador=user.id).order_by(Livro.id_livro.desc())
    ).all()


def grant_publish(db, user):
    if not user.is_admin and not profile_stats(db, user)["pode_publicar"]:
        raise HTTPException(403, "Publishing requires premium or a qualifying level")


def owned_book(db, user, book_id):
    row = require(db.get(Livro, book_id))
    if not user.is_admin and row.id_publicador != user.id:
        raise HTTPException(404, "Not found")
    if row.status_bloqueado and not user.is_admin:
        raise HTTPException(403, "Book blocked")
    return row


def metadata(db, row, data):
    if data.status_publicacao == "publicado" and not (CONTENT / f"{row.id_livro}.pdf").is_file():
        raise HTTPException(409, "Upload a PDF before publishing")
    for key, value in data.model_dump(exclude={"autores", "generos"}).items():
        setattr(row, key, value)
    for model, through, key, ids in [
        (Autor, LivroAutor, "id_autor", data.autores),
        (Genero, LivroGenero, "id_genero", data.generos),
    ]:
        if any(db.get(model, i) is None for i in set(ids)):
            raise HTTPException(422, "Unknown author or genre")
        db.execute(delete(through).where(through.id_livro == row.id_livro))
        db.add_all(through(id_livro=row.id_livro, **{key: i}) for i in set(ids))


@router.post("/books", response_model=LivroPublic, status_code=201)
def create(data: BookInput, db: DB, user: Reader):
    grant_publish(db, user)
    row = Livro(
        **data.model_dump(exclude={"autores", "generos", "status_publicacao"}),
        origem="catalogo" if user.is_admin else "usuario",
        id_publicador=user.id,
        arquivo_conteudo="pending",
    )
    db.add(row)
    db.flush()
    row.arquivo_conteudo = f"/v2/books/{row.id_livro}/content"
    metadata(db, row, data)
    return save(db, row)


@router.put("/books/{book_id}", response_model=LivroPublic)
def replace(book_id: int, data: BookInput, db: DB, user: Reader):
    row = owned_book(db, user, book_id)
    grant_publish(db, user)
    metadata(db, row, data)
    if user.is_admin:
        db.add(
            AtividadeAdmin(
                id_admin=user.id,
                id_livro_alvo=book_id,
                tipo_acao="editar_livro",
                descricao="Book metadata updated",
            )
        )
    return save(db, row)


@router.put("/books/{book_id}/content", status_code=204)
def upload(book_id: int, db: DB, user: Reader, file: UploadFile = File()):
    owned_book(db, user, book_id)
    grant_publish(db, user)
    CONTENT.mkdir(exist_ok=True)
    tmp = CONTENT / uuid4().hex
    try:
        with tmp.open("xb") as out:
            count = 0
            while chunk := file.file.read(65536):
                if count == 0 and not chunk.startswith(b"%PDF-"):
                    raise HTTPException(422, "Expected PDF")
                count += len(chunk)
                if count > MAX_BYTES:
                    raise HTTPException(413, "Maximum size 20 MiB")
                out.write(chunk)
        if not count:
            raise HTTPException(422, "Empty file")
        tmp.replace(CONTENT / f"{book_id}.pdf")
    finally:
        tmp.unlink(missing_ok=True)


@router.get(
    "/books/{book_id}/content",
    response_class=FileResponse,
    openapi_extra={"security": [{}]},
    responses={200: {"content": {"application/pdf": {}}}},
)
def content(book_id: int, db: DB, user: Annotated[User | None, Depends(optional_reader)]):
    row = require(db.get(Livro, book_id))
    if row.status_bloqueado or row.status_publicacao != "publicado":
        if user is None:
            raise HTTPException(404, "Not found")
        owned_book(db, user, book_id)
    path = CONTENT / f"{book_id}.pdf"
    if not path.is_file():
        raise HTTPException(404, "PDF not available")
    db.add(AcessoLivro(id_livro=book_id, id_usuario=user.id if user else None))
    db.commit()
    return FileResponse(path, media_type="application/pdf")
