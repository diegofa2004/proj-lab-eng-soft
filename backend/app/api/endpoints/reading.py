from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, text

from app.api.platform import DB, Reader, lock_reader, public_book, require, save
from app.api.reading_progress import apply_reading_progress
from app.db.base import (
    Avaliacao,
    ItemLista,
    MovimentoPontos,
    NotaPessoal,
    ProgressoLeitura,
    SessaoLeitura,
)
from app.schemas.avaliacao import AvaliacaoPublic
from app.schemas.common import NonEmptyText
from app.schemas.item_lista import ItemListaPublic, TipoItemLista
from app.schemas.movimento_pontos import MovimentoPontosPublic
from app.schemas.nota_pessoal import NotaPessoalCreate, NotaPessoalPublic, NotaPessoalUpdate
from app.schemas.progresso_leitura import ProgressoLeituraPublic
from app.schemas.sessao_leitura import SessaoLeituraPublic

router = APIRouter(tags=["Reading"])


def mine(db, user, model, **filters):
    return select(model).filter_by(id_usuario=user.id, **filters)


@router.get("/me/lists", response_model=list[ItemListaPublic])
def lists(db: DB, user: Reader, tipo: TipoItemLista | None = None):
    query = mine(db, user, ItemLista)
    if tipo:
        query = query.filter_by(tipo=tipo)
    return db.scalars(query.order_by(ItemLista.id_item.desc())).all()


@router.put("/me/lists/{tipo}/{book_id}", response_model=ItemListaPublic)
def bookmark(tipo: TipoItemLista, book_id: int, db: DB, user: Reader):
    public_book(db, book_id)
    lock_reader(db, user)
    keys = dict(id_livro=book_id, tipo=tipo)
    row = db.scalar(mine(db, user, ItemLista, **keys))
    return row or save(db, ItemLista(id_usuario=user.id, **keys))


@router.delete("/me/lists/{tipo}/{book_id}", status_code=204)
def unbookmark(tipo: TipoItemLista, book_id: int, db: DB, user: Reader):
    lock_reader(db, user)
    row = db.scalar(mine(db, user, ItemLista, id_livro=book_id, tipo=tipo))
    if row:
        db.delete(row)
        db.commit()


@router.get("/me/notes", response_model=list[NotaPessoalPublic])
def notes(db: DB, user: Reader, book_id: int | None = None):
    query = mine(db, user, NotaPessoal)
    if book_id is not None:
        query = query.filter_by(id_livro=book_id)
    return db.scalars(query.order_by(NotaPessoal.id_nota)).all()


@router.post("/me/notes", response_model=NotaPessoalPublic, status_code=201)
def note(data: NotaPessoalCreate, db: DB, user: Reader):
    public_book(db, data.id_livro)
    return save(db, NotaPessoal(id_usuario=user.id, **data.model_dump()))


@router.patch("/me/notes/{note_id}", response_model=NotaPessoalPublic)
def edit_note(note_id: int, data: NotaPessoalUpdate, db: DB, user: Reader):
    row = require(db.scalar(mine(db, user, NotaPessoal, id_nota=note_id)))
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    return save(db, row)


@router.delete("/me/notes/{note_id}", status_code=204)
def delete_note(note_id: int, db: DB, user: Reader):
    db.delete(require(db.scalar(mine(db, user, NotaPessoal, id_nota=note_id))))
    db.commit()


class Review(BaseModel):
    nota: int = Field(ge=1, le=5)
    texto_revisao: NonEmptyText | None = None


@router.get("/books/{book_id}/reviews", response_model=list[AvaliacaoPublic])
def reviews(book_id: int, db: DB):
    public_book(db, book_id)
    return db.scalars(
        select(Avaliacao)
        .filter_by(id_livro=book_id, is_removida=False)
        .order_by(Avaliacao.id_avaliacao.desc())
    ).all()


@router.put("/books/{book_id}/review", response_model=AvaliacaoPublic)
def review(book_id: int, data: Review, db: DB, user: Reader):
    public_book(db, book_id)
    lock_reader(db, user)
    row = db.scalar(mine(db, user, Avaliacao, id_livro=book_id))
    if row and row.is_removida:
        raise HTTPException(403, "Review moderated")
    row = row or Avaliacao(id_usuario=user.id, id_livro=book_id)
    row.nota = data.nota
    row.texto_revisao = data.texto_revisao
    return save(db, row)


@router.delete("/books/{book_id}/review", status_code=204)
def delete_review(book_id: int, db: DB, user: Reader):
    row = require(db.scalar(mine(db, user, Avaliacao, id_livro=book_id)))
    if row.is_removida:
        raise HTTPException(403, "Review moderated")
    db.delete(row)
    db.commit()


class Progress(BaseModel):
    ultima_posicao: str | None = None
    paginas_distintas_lidas: int = Field(ge=0, le=2147483647)


@router.get("/me/progress", response_model=list[ProgressoLeituraPublic])
def progress(db: DB, user: Reader):
    return db.scalars(mine(db, user, ProgressoLeitura).order_by(ProgressoLeitura.id_livro)).all()


@router.put("/me/progress/{book_id}", response_model=ProgressoLeituraPublic)
def progress_update(book_id: int, data: Progress, db: DB, user: Reader):
    book = public_book(db, book_id)
    lock_reader(db, user)
    row = db.scalar(mine(db, user, ProgressoLeitura, id_livro=book_id))
    row = apply_reading_progress(
        db, user, book, row, data.paginas_distintas_lidas, data.ultima_posicao
    )
    return save(db, row)


@router.post("/me/sessions/{book_id}", response_model=SessaoLeituraPublic, status_code=201)
def start(book_id: int, db: DB, user: Reader):
    public_book(db, book_id)
    lock_reader(db, user)
    current = db.scalar(mine(db, user, SessaoLeitura, id_livro=book_id, fim=None))
    return current or save(db, SessaoLeitura(id_usuario=user.id, id_livro=book_id))


class SessionEnd(BaseModel):
    tempo_ativo_segundos: int = Field(ge=0)


@router.put("/me/sessions/{session_id}/end", response_model=SessaoLeituraPublic)
def finish(session_id: int, data: SessionEnd, db: DB, user: Reader):
    lock_reader(db, user)
    row = require(db.scalar(mine(db, user, SessaoLeitura, id_sessao=session_id)))
    if row.fim is None:
        row.fim = datetime.now(UTC)
        row.tempo_ativo_segundos = min(
            data.tempo_ativo_segundos, max(0, int((row.fim - row.inicio).total_seconds()))
        )
        return save(db, row)
    return row


@router.get("/me/points", response_model=list[MovimentoPontosPublic])
def points(db: DB, user: Reader):
    return db.scalars(
        mine(db, user, MovimentoPontos).order_by(MovimentoPontos.id_movimento.desc())
    ).all()


class Dashboard(BaseModel):
    id_usuario: int
    livros_concluidos: int
    paginas_lidas: int
    tempo_ativo_segundos: int
    generos_lidos: int
    autores_lidos: int


@router.get("/me/dashboard", response_model=Dashboard)
def dashboard(db: DB, user: Reader):
    return (
        db.execute(
            text("SELECT * FROM plataforma.v_dashboard_leitura WHERE id_usuario=:uid"),
            {"uid": user.id},
        )
        .mappings()
        .one()
    )


@router.get("/me/sessions", response_model=list[SessaoLeituraPublic])
def sessions(db: DB, user: Reader):
    return db.scalars(mine(db, user, SessaoLeitura).order_by(SessaoLeitura.id_sessao.desc())).all()
