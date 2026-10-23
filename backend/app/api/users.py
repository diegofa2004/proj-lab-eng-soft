from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.assinatura import Assinatura
from app.models.item_lista import ItemLista
from app.models.livro import Livro
from app.models.movimento_pontos import MovimentoPontos
from app.models.nivel import Nivel
from app.models.plano import Plano
from app.models.progresso_leitura import ProgressoLeitura
from app.models.sessao_leitura import SessaoLeitura
from app.models.user import User

router = APIRouter(prefix="/users/me", tags=["users"])
content_router = APIRouter(prefix="/content", tags=["content"])
premium_router = APIRouter(prefix="/premium", tags=["premium"])


def user_points(db: Session, user_id: int) -> int:
    return int(db.scalar(select(func.coalesce(func.sum(MovimentoPontos.quantidade), 0)).where(MovimentoPontos.id_usuario == user_id)) or 0)


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    completed = db.scalar(select(func.count()).select_from(ProgressoLeitura).where(ProgressoLeitura.id_usuario == user.id, ProgressoLeitura.concluido_em.is_not(None))) or 0
    pages = db.scalar(select(func.coalesce(func.sum(ProgressoLeitura.paginas_distintas_lidas), 0)).where(ProgressoLeitura.id_usuario == user.id)) or 0
    seconds = db.scalar(select(func.coalesce(func.sum(SessaoLeitura.tempo_ativo_segundos), 0)).where(SessaoLeitura.id_usuario == user.id)) or 0
    return {"books_read": completed, "pages_read": pages, "active_seconds": seconds}


@router.get("/points")
def points(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    total = user_points(db, user.id)
    level = db.scalar(select(Nivel).where(Nivel.pontos_minimos <= max(total, 0)).order_by(Nivel.pontos_minimos.desc()).limit(1))
    return {"points": total, "level": level.nome if level else None, "publisher": bool(level and level.permite_publicar)}


@router.post("/inactivity")
def inactivity(days: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if days <= 0:
        raise HTTPException(status_code=422, detail="Days must be positive")
    movement = MovimentoPontos(id_usuario=user.id, quantidade=-days, motivo="inatividade", data_referencia=date.today(), chave_evento=f"inactivity:{user.id}:{date.today().isoformat()}")
    db.add(movement)
    try:
        db.commit()
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Inactivity was already recorded for today") from error
    return points(db, user)


@router.get("/suggestions")
def suggestions(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[Livro]:
    return list(db.scalars(select(Livro).where(Livro.status_publicacao == "publicado", Livro.status_bloqueado.is_(False)).order_by(Livro.criado_em.desc()).limit(20)).all())


@router.post("/subscription")
def subscribe(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict[str, str]:
    plan = db.scalar(select(Plano).where(Plano.ativo.is_(True)).order_by(Plano.id_plano).limit(1))
    if plan is None:
        raise HTTPException(status_code=503, detail="No active subscription plan is configured")
    active = db.scalar(select(Assinatura).where(Assinatura.id_usuario == user.id, Assinatura.status == "ativa"))
    if active is not None:
        return {"status": "active"}
    now = datetime.now(timezone.utc)
    db.add(Assinatura(id_usuario=user.id, id_plano=plan.id_plano, status="ativa", inicio=now, fim=now + timedelta(days=30)))
    db.commit()
    return {"status": "active", "plan": plan.nome}


@premium_router.get("/discover")
def discover(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[Livro]:
    active = db.scalar(select(Assinatura).where(Assinatura.id_usuario == user.id, Assinatura.status == "ativa"))
    if active is None:
        raise HTTPException(status_code=403, detail="Premium subscription required")
    return list(db.scalars(select(Livro).where(Livro.status_publicacao == "publicado", Livro.status_bloqueado.is_(False))).all())


@content_router.get("/user-created")
def user_created_content(db: Session = Depends(get_db)) -> list[Livro]:
    return list(db.scalars(select(Livro).where(Livro.origem == "usuario", Livro.status_publicacao == "publicado", Livro.status_bloqueado.is_(False))).all())