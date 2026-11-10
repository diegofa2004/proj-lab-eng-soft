import zipfile
from datetime import date
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select, text

from app.api.platform import DB, Limit, Offset, Reader, profile_stats, require, save
from app.core.deps import optional_reader
from app.db.base import (
    AcessoLivro,
    AtividadeAdmin,
    Autor,
    CapaLivro,
    Genero,
    Livro,
    LivroAutor,
    LivroGenero,
    ProgressoLeitura,
)
from app.epub_progress import epub_progress_positions
from app.models.user import User
from app.schemas.autor import AutorPublic
from app.schemas.common import BookTitle, PositiveId
from app.schemas.genero import GeneroPublic
from app.schemas.livro import LivroPublic, StatusPublicacao

router = APIRouter(tags=["Catalog"])
CONTENT = Path("content")
MAX_BYTES = 50 * 1024 * 1024
EPUB_MIME_TYPE = "application/epub+zip"


def validate_epub(path: Path) -> None:
    """Reject non-EPUB zip files and archives that could exhaust the server."""
    try:
        with zipfile.ZipFile(path) as archive:
            files = archive.infolist()
            if (
                not files
                or files[0].filename != "mimetype"
                or files[0].compress_type != zipfile.ZIP_STORED
            ):
                raise ValueError("missing EPUB mimetype")
            if archive.read("mimetype") != EPUB_MIME_TYPE.encode():
                raise ValueError("wrong EPUB mimetype")
            names = {entry.filename for entry in files}
            if "META-INF/container.xml" not in names:
                raise ValueError("missing EPUB container")
            if len(files) > 10_000 or sum(entry.file_size for entry in files) > 250 * 1024 * 1024:
                raise ValueError("EPUB is too large when expanded")
    except (OSError, ValueError, zipfile.BadZipFile, KeyError) as exc:
        raise HTTPException(422, "Invalid EPUB3 file") from exc


def validate_page_count(db, row, total_pages: int) -> None:
    max_read = (
        db.scalar(
            select(func.max(ProgressoLeitura.paginas_distintas_lidas)).where(
                ProgressoLeitura.id_livro == row.id_livro
            )
        )
        or 0
    )
    if total_pages < max_read:
        raise HTTPException(422, "Position count cannot be below recorded reading progress")
    if (
        total_pages != row.total_paginas
        and db.scalar(
            select(ProgressoLeitura.id_progresso)
            .where(
                ProgressoLeitura.id_livro == row.id_livro,
                ProgressoLeitura.concluido_em.is_not(None),
            )
            .limit(1)
        )
        is not None
    ):
        raise HTTPException(409, "Position count cannot change after a completed reading")


def stored_epub_positions(row) -> int | None:
    path = CONTENT / f"{row.id_livro}.epub"
    if not path.is_file():
        return None
    validate_epub(path)
    try:
        return epub_progress_positions(path)
    except ValueError as exc:
        raise HTTPException(422, "Unable to calculate EPUB reading positions") from exc


def require_publication_ready(row, _total_pages: int) -> int:
    total_positions = stored_epub_positions(row)
    if total_positions is None:
        raise HTTPException(409, "Upload an EPUB3 file before publishing")
    return total_positions


class BookInput(BaseModel):
    titulo: BookTitle
    descricao: str = ""
    data_publicacao: date
    total_paginas: int = Field(gt=0, le=2147483647)
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
    total_positions = stored_epub_positions(row) or data.total_paginas
    validate_page_count(db, row, total_positions)
    if data.status_publicacao == "publicado":
        total_positions = require_publication_ready(row, total_positions)
    for key, value in data.model_dump(exclude={"autores", "generos"}).items():
        if key == "total_paginas":
            value = total_positions
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
    row = owned_book(db, user, book_id)
    grant_publish(db, user)
    CONTENT.mkdir(exist_ok=True)
    tmp = CONTENT / uuid4().hex
    try:
        with tmp.open("xb") as out:
            count = 0
            while chunk := file.file.read(65536):
                if count == 0 and not chunk.startswith(b"PK"):
                    raise HTTPException(422, "Expected an EPUB3 file")
                count += len(chunk)
                if count > MAX_BYTES:
                    raise HTTPException(413, "Maximum size 50 MiB")
                out.write(chunk)
        if not count:
            raise HTTPException(422, "Empty file")
        validate_epub(tmp)
        try:
            total_positions = epub_progress_positions(tmp)
        except ValueError as exc:
            raise HTTPException(422, "Unable to calculate EPUB reading positions") from exc
        validate_page_count(db, row, total_positions)
        tmp.replace(CONTENT / f"{book_id}.epub")
        row.total_paginas = total_positions
        db.commit()
    finally:
        tmp.unlink(missing_ok=True)


@router.get(
    "/books/{book_id}/content",
    response_class=FileResponse,
    openapi_extra={"security": [{}]},
    responses={200: {"content": {EPUB_MIME_TYPE: {}}}},
)
def content(book_id: int, db: DB, user: Annotated[User | None, Depends(optional_reader)]):
    row = require(db.get(Livro, book_id))
    if row.status_bloqueado or row.status_publicacao != "publicado":
        if user is None:
            raise HTTPException(404, "Not found")
        owned_book(db, user, book_id)
    path = CONTENT / f"{book_id}.epub"
    if not path.is_file():
        raise HTTPException(404, "EPUB3 file not available")
    db.add(AcessoLivro(id_livro=book_id, id_usuario=user.id if user else None))
    db.commit()
    return FileResponse(path, media_type=EPUB_MIME_TYPE, filename=f"book-{book_id}.epub")


@router.get(
    "/books/{book_id}/cover",
    response_class=FileResponse,
    responses={200: {"content": {"image/jpeg": {}}}},
)
def cover(book_id: int, db: DB):
    book = require(db.get(Livro, book_id))
    if book.status_bloqueado or book.status_publicacao != "publicado":
        raise HTTPException(404, "Not found")
    if db.get(CapaLivro, book_id) is None:
        raise HTTPException(404, "Cover not available")
    path = CONTENT / "covers" / f"{book_id}.jpg"
    if not path.is_file():
        raise HTTPException(404, "Cover not available")
    return FileResponse(path, media_type="image/jpeg")
