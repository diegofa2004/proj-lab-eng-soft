from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select, text

from app.api.platform import DB, Admin, Limit, Offset, require, save
from app.db.base import AtividadeAdmin, Avaliacao, Livro, User
from app.schemas.atividade_admin import AtividadeAdminCreate, AtividadeAdminPublic
from app.schemas.avaliacao import AvaliacaoPublic
from app.schemas.common import PublicSchema
from app.schemas.livro import LivroPublic

router = APIRouter(prefix="/admin", tags=["Administration"])


class AdminUser(PublicSchema):
    id: int
    username: str
    email: str
    biography: str
    is_blocked: bool
    is_admin: bool
    created_at: datetime


class AdminReview(AvaliacaoPublic):
    titulo_livro: str
    nome_usuario: str


@router.get("/users", response_model=list[AdminUser])
def users(
    db: DB,
    admin: Admin,
    limit: Limit = 50,
    offset: Offset = 0,
    q: str = Query(default="", max_length=200),
):
    query = select(User)
    if q.strip():
        pattern = f"%{q.strip()}%"
        query = query.where(or_(User.username.ilike(pattern), User.email.ilike(pattern)))
    return db.scalars(query.order_by(User.id.desc()).limit(limit).offset(offset)).all()


@router.get("/users/{user_id}", response_model=AdminUser)
def user_detail(user_id: int, db: DB, admin: Admin):
    return require(db.get(User, user_id))


def review_details(query, db: DB):
    return [
        dict(
            AvaliacaoPublic.model_validate(review).model_dump(),
            titulo_livro=title,
            nome_usuario=username,
        )
        for review, title, username in db.execute(query)
    ]


@router.get("/users/{user_id}/reviews", response_model=list[AdminReview])
def user_reviews(user_id: int, db: DB, admin: Admin, limit: Limit = 50, offset: Offset = 0):
    require(db.get(User, user_id))
    return review_details(
        select(Avaliacao, Livro.titulo, User.username)
        .join(Livro, Livro.id_livro == Avaliacao.id_livro)
        .join(User, User.id == Avaliacao.id_usuario)
        .where(Avaliacao.id_usuario == user_id)
        .order_by(Avaliacao.data_hora.desc(), Avaliacao.id_avaliacao.desc())
        .limit(limit)
        .offset(offset),
        db,
    )


@router.get("/books", response_model=list[LivroPublic])
def books(
    db: DB,
    admin: Admin,
    limit: Limit = 50,
    offset: Offset = 0,
    q: str = Query(default="", max_length=200),
):
    query = select(Livro)
    if q.strip():
        query = query.where(Livro.titulo.ilike(f"%{q.strip()}%"))
    return db.scalars(query.order_by(Livro.id_livro.desc()).limit(limit).offset(offset)).all()


@router.get("/reviews", response_model=list[AvaliacaoPublic])
def reviews(db: DB, admin: Admin, limit: Limit = 50, offset: Offset = 0):
    return db.scalars(
        select(Avaliacao).order_by(Avaliacao.id_avaliacao.desc()).limit(limit).offset(offset)
    ).all()


@router.get("/reviews/feed", response_model=list[AdminReview])
def review_feed(db: DB, admin: Admin, limit: Limit = 50, offset: Offset = 0):
    return review_details(
        select(Avaliacao, Livro.titulo, User.username)
        .join(Livro, Livro.id_livro == Avaliacao.id_livro)
        .join(User, User.id == Avaliacao.id_usuario)
        .where(Avaliacao.is_removida.is_(False))
        .order_by(Avaliacao.data_hora.desc(), Avaliacao.id_avaliacao.desc())
        .limit(limit)
        .offset(offset),
        db,
    )


@router.get("/actions", response_model=list[AtividadeAdminPublic])
def logs(db: DB, admin: Admin, limit: Limit = 50, offset: Offset = 0):
    return db.scalars(
        select(AtividadeAdmin).order_by(AtividadeAdmin.id_log.desc()).limit(limit).offset(offset)
    ).all()


@router.post("/actions", response_model=AtividadeAdminPublic, status_code=201)
def moderate(data: AtividadeAdminCreate, db: DB, admin: Admin):
    if data.tipo_acao == "editar_livro":
        raise HTTPException(422, "Use PUT /books/{book_id} to edit metadata")
    if data.id_usuario_alvo:
        row = require(db.get(User, data.id_usuario_alvo))
        if row.is_admin:
            raise HTTPException(403, "Administrator account protected")
        row.is_blocked = data.tipo_acao == "bloquear_usuario"
    elif data.id_livro_alvo:
        row = require(db.get(Livro, data.id_livro_alvo))
        row.status_bloqueado = data.tipo_acao == "bloquear_livro"
    else:
        row = require(db.get(Avaliacao, data.id_avaliacao_alvo))
        row.is_removida = True
    return save(db, AtividadeAdmin(id_admin=admin.id, **data.model_dump()))


class AccessBook(BaseModel):
    id_livro: int
    titulo: str
    acessos: int


class AccessGenre(BaseModel):
    id_genero: int
    nome: str
    acessos: int


class UsersReport(BaseModel):
    total_usuarios: int
    usuarios_nao_bloqueados: int
    usuarios_bloqueados: int


class Report(BaseModel):
    users: UsersReport
    books: list[AccessBook]
    genres: list[AccessGenre]


@router.get("/dashboard", response_model=Report)
def report(db: DB, admin: Admin):
    return {
        "users": db.execute(text("SELECT * FROM plataforma.v_admin_quantidade_usuarios"))
        .mappings()
        .one(),
        "books": db.execute(
            text("SELECT * FROM plataforma.v_admin_acessos_conteudo ORDER BY acessos DESC,id_livro")
        )
        .mappings()
        .all(),
        "genres": db.execute(
            text(
                "SELECT * FROM plataforma.v_admin_acessos_categoria ORDER BY acessos DESC,id_genero"
            )
        )
        .mappings()
        .all(),
    }
