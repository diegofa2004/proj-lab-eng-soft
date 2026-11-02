from fastapi import APIRouter
from sqlalchemy import select

from app.api.platform import DB, Admin, require, save
from app.models.asset_perfil import AssetPerfil
from app.models.autor import Autor
from app.models.genero import Genero
from app.models.nivel import Nivel
from app.models.plano import Plano
from app.schemas.asset_perfil import AssetPerfilCreate, AssetPerfilPublic, AssetPerfilUpdate
from app.schemas.autor import AutorCreate, AutorPublic, AutorUpdate
from app.schemas.genero import GeneroCreate, GeneroPublic, GeneroUpdate
from app.schemas.nivel import NivelCreate, NivelPublic, NivelUpdate
from app.schemas.plano import PlanoCreate, PlanoPublic, PlanoUpdate

router = APIRouter(tags=["Reference data"])


@router.get("/authors", response_model=list[AutorPublic])
def list_authors(db: DB):
    return db.scalars(select(Autor).order_by(Autor.id_autor)).all()


@router.post("/admin/authors", response_model=AutorPublic, status_code=201)
def create_autor(data: AutorCreate, db: DB, admin: Admin):
    return save(db, Autor(**data.model_dump()))


@router.patch("/admin/authors/{item_id}", response_model=AutorPublic)
def edit_autor(item_id: int, data: AutorUpdate, db: DB, admin: Admin):
    row = require(db.get(Autor, item_id))
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    return save(db, row)


@router.get("/genres", response_model=list[GeneroPublic])
def list_genres(db: DB):
    return db.scalars(select(Genero).order_by(Genero.id_genero)).all()


@router.post("/admin/genres", response_model=GeneroPublic, status_code=201)
def create_genero(data: GeneroCreate, db: DB, admin: Admin):
    return save(db, Genero(**data.model_dump()))


@router.patch("/admin/genres/{item_id}", response_model=GeneroPublic)
def edit_genero(item_id: int, data: GeneroUpdate, db: DB, admin: Admin):
    row = require(db.get(Genero, item_id))
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    return save(db, row)


@router.get("/plans", response_model=list[PlanoPublic])
def list_plans(db: DB):
    return db.scalars(select(Plano).filter_by(ativo=True).order_by(Plano.id_plano)).all()


@router.post("/admin/plans", response_model=PlanoPublic, status_code=201)
def create_plano(data: PlanoCreate, db: DB, admin: Admin):
    return save(db, Plano(**data.model_dump()))


@router.patch("/admin/plans/{item_id}", response_model=PlanoPublic)
def edit_plano(item_id: int, data: PlanoUpdate, db: DB, admin: Admin):
    row = require(db.get(Plano, item_id))
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    return save(db, row)


@router.get("/levels", response_model=list[NivelPublic])
def list_levels(db: DB):
    return db.scalars(select(Nivel).order_by(Nivel.id_nivel)).all()


@router.post("/admin/levels", response_model=NivelPublic, status_code=201)
def create_nivel(data: NivelCreate, db: DB, admin: Admin):
    return save(db, Nivel(**data.model_dump()))


@router.patch("/admin/levels/{item_id}", response_model=NivelPublic)
def edit_nivel(item_id: int, data: NivelUpdate, db: DB, admin: Admin):
    row = require(db.get(Nivel, item_id))
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    return save(db, row)


@router.get("/assets", response_model=list[AssetPerfilPublic])
def list_assets(db: DB):
    return db.scalars(select(AssetPerfil).order_by(AssetPerfil.id_asset)).all()


@router.post("/admin/assets", response_model=AssetPerfilPublic, status_code=201)
def create_asset_perfil(data: AssetPerfilCreate, db: DB, admin: Admin):
    return save(db, AssetPerfil(**data.model_dump()))


@router.patch("/admin/assets/{item_id}", response_model=AssetPerfilPublic)
def edit_asset_perfil(item_id: int, data: AssetPerfilUpdate, db: DB, admin: Admin):
    row = require(db.get(AssetPerfil, item_id))
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    return save(db, row)


@router.get("/demo/avatar.svg", include_in_schema=False)
def demo_avatar():
    from pathlib import Path

    from fastapi.responses import FileResponse

    return FileResponse(
        Path(__file__).resolve().parents[2] / "demo/avatar.svg", media_type="image/svg+xml"
    )


@router.get("/admin/plans", response_model=list[PlanoPublic])
def all_plans(db: DB, admin: Admin):
    return db.scalars(select(Plano).order_by(Plano.id_plano)).all()
