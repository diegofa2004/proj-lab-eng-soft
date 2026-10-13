from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class ProgressoLeitura(Base):
    __tablename__ = "progresso_leitura"
    __table_args__ = (
        CheckConstraint("paginas_distintas_lidas >= 0", name="ck_progresso_paginas"),
        UniqueConstraint("id_usuario", "id_livro"),
        {"schema": SCHEMA},
    )

    id_progresso: Mapped[int] = primary_key_column()
    id_usuario: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT"), nullable=False
    )
    id_livro: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="RESTRICT"), nullable=False
    )
    ultima_posicao: Mapped[str | None] = mapped_column(Text)
    paginas_distintas_lidas: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    concluido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
