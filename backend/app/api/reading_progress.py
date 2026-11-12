"""Shared rules for both reading progress endpoints."""

from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.acesso_livro import AcessoLivro
from app.models.item_lista import ItemLista
from app.models.livro import Livro
from app.models.movimento_pontos import MovimentoPontos
from app.models.progresso_leitura import ProgressoLeitura
from app.models.user import User


def apply_reading_progress(
    db: Session,
    user: User,
    book: Livro,
    row: ProgressoLeitura | None,
    pages: int | None,
    position: str | None = None,
    *,
    set_position: bool = True,
) -> ProgressoLeitura:
    current_pages = row.paginas_distintas_lidas if row is not None else 0
    pages = max(pages if pages is not None else current_pages, current_pages)
    if pages > book.total_paginas:
        raise HTTPException(422, "Reading position count exceeds book length")
    if (
        pages > 0
        and db.scalar(
            select(AcessoLivro.id_acesso)
            .where(AcessoLivro.id_usuario == user.id, AcessoLivro.id_livro == book.id_livro)
            .limit(1)
        )
        is None
    ):
        raise HTTPException(403, "Open the book content before reporting reading progress")
    if row is None:
        row = ProgressoLeitura(id_usuario=user.id, id_livro=book.id_livro)
    row.paginas_distintas_lidas = pages
    if set_position:
        row.ultima_posicao = position
    if pages == book.total_paginas and row.concluido_em is None:
        row.concluido_em = datetime.now(UTC)
        rewarded = db.scalar(
            select(MovimentoPontos.id_movimento)
            .where(
                MovimentoPontos.id_usuario == user.id,
                MovimentoPontos.id_livro == book.id_livro,
                MovimentoPontos.motivo == "leitura",
            )
            .limit(1)
        )
        if rewarded is None:
            db.add(
                MovimentoPontos(
                    id_usuario=user.id,
                    id_livro=book.id_livro,
                    quantidade=1,
                    motivo="leitura",
                    chave_evento=f"completed:{user.id}:{book.id_livro}",
                )
            )
    db.execute(
        delete(ItemLista).where(
            ItemLista.id_usuario == user.id,
            ItemLista.id_livro == book.id_livro,
            ItemLista.tipo == "ler_depois",
        )
    )
    return row
