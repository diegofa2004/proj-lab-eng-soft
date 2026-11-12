from calendar import monthrange
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select

from app.api.platform import DB, Reader, lock_reader, profile_stats, require, save
from app.core.config import settings
from app.db.base import (
    AssetPerfil,
    Assinatura,
    GeneroCanonico,
    Nivel,
    Pagamento,
    Plano,
    PreferenciaGeneroUsuario,
)
from app.schemas.assinatura import AssinaturaPublic
from app.schemas.common import PositiveId
from app.schemas.pagamento import PagamentoPublic
from app.schemas.preferencia_genero_usuario import (
    PreferenciasGeneroPublic,
    PreferenciasGeneroUpdate,
)

router = APIRouter(tags=["Account"])

ProfileRing = Literal[
    "subscriber",
    "bronze",
    "diamond",
    "emerald",
    "master",
    "gold",
    "silver",
    "publisher",
]

ProfileBackground = Literal[
    "editorial-paper",
    "abstract-pages",
    "dark-library",
    "cosmic-library",
    "literary-watercolor",
    "noir-detective",
    "romance",
    "academic-education",
]


class Profile(BaseModel):
    id_usuario: int
    nome_perfil: str
    email: str
    biografia: str
    id_avatar: int | None
    id_icone: int | None
    profile_ring: ProfileRing | None
    profile_background: ProfileBackground | None
    is_admin: bool
    pontos_leitura: int
    id_nivel: int | None
    nivel: str | None
    is_premium: bool
    pode_publicar: bool
    onboarding_generos_concluido: bool


class ProfileEdit(BaseModel):
    biografia: str = Field(default="", max_length=5000)
    id_avatar: PositiveId | None = None
    id_icone: PositiveId | None = None
    profile_ring: ProfileRing | None = None
    profile_background: ProfileBackground | None = None


@router.get("/me/profile", response_model=Profile)
def profile(db: DB, user: Reader):
    return dict(
        profile_stats(db, user),
        email=user.email,
        biografia=user.biography,
        id_avatar=user.avatar_id,
        id_icone=user.icon_id,
        profile_ring=user.profile_ring,
        profile_background=user.profile_background,
        onboarding_generos_concluido=user.genre_onboarding_complete,
    )


@router.get("/me/genre-preferences", response_model=PreferenciasGeneroPublic)
def genre_preferences(db: DB, user: Reader):
    rows = db.execute(
        select(
            PreferenciaGeneroUsuario.id_genero_canonico,
            PreferenciaGeneroUsuario.tipo,
        ).where(PreferenciaGeneroUsuario.id_usuario == user.id)
    ).all()
    return {
        "concluido": user.genre_onboarding_complete,
        "interesses": [genre_id for genre_id, kind in rows if kind == "interesse"],
        "nao_interessa": [genre_id for genre_id, kind in rows if kind == "nao_interessa"],
    }


@router.put("/me/genre-preferences", response_model=PreferenciasGeneroPublic)
def update_genre_preferences(data: PreferenciasGeneroUpdate, db: DB, user: Reader):
    genre_ids = set(data.interesses) | set(data.nao_interessa)
    if genre_ids:
        existing = set(
            db.scalars(
                select(GeneroCanonico.id_genero_canonico).where(
                    GeneroCanonico.id_genero_canonico.in_(genre_ids),
                    GeneroCanonico.ativo.is_(True),
                )
            ).all()
        )
        if existing != genre_ids:
            raise HTTPException(422, "Unknown or inactive canonical genre")
    db.execute(
        delete(PreferenciaGeneroUsuario).where(PreferenciaGeneroUsuario.id_usuario == user.id)
    )
    db.add_all(
        PreferenciaGeneroUsuario(id_usuario=user.id, id_genero_canonico=genre_id, tipo="interesse")
        for genre_id in data.interesses
    )
    db.add_all(
        PreferenciaGeneroUsuario(
            id_usuario=user.id,
            id_genero_canonico=genre_id,
            tipo="nao_interessa",
        )
        for genre_id in data.nao_interessa
    )
    user.genre_onboarding_complete = True
    db.commit()
    return {
        "concluido": True,
        "interesses": data.interesses,
        "nao_interessa": data.nao_interessa,
    }


@router.patch("/me/profile", response_model=Profile)
def update_profile(data: ProfileEdit, db: DB, user: Reader):
    stats = profile_stats(db, user)
    changes = data.model_dump(exclude_unset=True)
    for field, kind, attr in [
        ("id_avatar", "avatar", "avatar_id"),
        ("id_icone", "icone", "icon_id"),
    ]:
        if field not in changes:
            continue
        value = changes[field]
        if value is not None:
            asset = require(db.get(AssetPerfil, value))
            if asset.tipo != kind:
                raise HTTPException(422, "Wrong asset type")
            level = db.get(Nivel, asset.id_nivel_minimo) if asset.id_nivel_minimo else None
            if (asset.exige_premium and not stats["is_premium"]) or (
                level and level.pontos_minimos > stats["pontos_leitura"]
            ):
                raise HTTPException(403, "Asset is locked")
        setattr(user, attr, value)
    if "biografia" in changes:
        user.biography = data.biografia
    if "profile_ring" in changes:
        user.profile_ring = data.profile_ring
    if "profile_background" in changes:
        user.profile_background = data.profile_background
    save(db, user)
    return profile(db, user)


class Checkout(BaseModel):
    id_plano: PositiveId


class CheckoutResult(BaseModel):
    subscription: AssinaturaPublic
    payment: PagamentoPublic


@router.get("/billing/config")
def billing_config() -> dict[str, bool]:
    return {"demo_billing": settings.DEMO_BILLING}


@router.get("/me/subscriptions", response_model=list[AssinaturaPublic])
def subscriptions(db: DB, user: Reader):
    return db.scalars(
        select(Assinatura).filter_by(id_usuario=user.id).order_by(Assinatura.id_assinatura.desc())
    ).all()


@router.get("/me/payments", response_model=list[PagamentoPublic])
def payments(db: DB, user: Reader):
    return db.scalars(
        select(Pagamento)
        .join(Assinatura)
        .where(Assinatura.id_usuario == user.id)
        .order_by(Pagamento.id_pagamento.desc())
    ).all()


def cycle_end(now, plan):
    delta = 1 if plan.periodicidade == "mensal" else 12
    months = now.year * 12 + now.month - 1 + delta
    year, month = divmod(months, 12)
    return now.replace(year=year, month=month + 1, day=min(now.day, monthrange(year, month + 1)[1]))


@router.post("/me/checkout", response_model=CheckoutResult)
def checkout(data: Checkout, db: DB, user: Reader):
    return purchase_plan(db, user, data.id_plano)


def purchase_plan(db, user, plan_id):
    """Demo checkout shared by the legacy and v2 routes; legacy selects a default plan."""
    if not settings.DEMO_BILLING:
        raise HTTPException(503, "Payment provider not configured")
    lock_reader(db, user)
    active = db.scalar(select(Assinatura).filter_by(id_usuario=user.id, status="ativa"))
    now = datetime.now(UTC)
    if active and active.fim <= now:
        active.status = "expirada"
        db.flush()
    elif active:
        if plan_id is not None and active.id_plano != plan_id:
            raise HTTPException(409, "Cancel the current plan before switching")
        payment = db.scalar(select(Pagamento).filter_by(id_assinatura=active.id_assinatura))
        if payment is None and plan_id is not None:
            raise HTTPException(409, "An existing subscription has no payment record")
        return {"subscription": active, "payment": payment}
    plans = select(Plano).filter_by(ativo=True)
    if plan_id is None:
        plan = db.scalar(plans.order_by(Plano.id_plano).limit(1))
        if plan is None:
            raise HTTPException(503, "No active subscription plan is configured")
    else:
        plan = require(db.scalar(plans.filter_by(id_plano=plan_id)))
    sub = Assinatura(
        id_usuario=user.id,
        id_plano=plan.id_plano,
        inicio=now,
        fim=cycle_end(now, plan),
        status="ativa",
    )
    db.add(sub)
    db.flush()
    payment = Pagamento(
        id_assinatura=sub.id_assinatura,
        valor=plan.preco,
        moeda=plan.moeda,
        status="aprovado",
        referencia_provedor=f"DEMO-{sub.id_assinatura}",
    )
    save(db, payment)
    return {"subscription": sub, "payment": payment}


@router.delete("/me/subscriptions/{sub_id}", response_model=AssinaturaPublic)
def cancel(sub_id: int, db: DB, user: Reader):
    lock_reader(db, user)
    sub = require(db.scalar(select(Assinatura).filter_by(id_assinatura=sub_id, id_usuario=user.id)))
    if sub.status in {"ativa", "pendente"}:
        sub.status = "cancelada"
        save(db, sub)
    return sub


class PublicProfile(BaseModel):
    id_usuario: int
    nome_perfil: str
    biografia: str
    id_avatar: int | None
    id_icone: int | None
    profile_ring: ProfileRing | None
    profile_background: ProfileBackground | None
    nivel: str | None


@router.get("/profiles/{user_id}", response_model=PublicProfile)
def public_profile(user_id: int, db: DB):
    from app.models.user import User

    reader = require(db.scalar(select(User).filter_by(id=user_id, is_blocked=False)))
    return dict(
        profile_stats(db, reader),
        biografia=reader.biography,
        id_avatar=reader.avatar_id,
        id_icone=reader.icon_id,
        profile_ring=reader.profile_ring,
        profile_background=reader.profile_background,
    )
