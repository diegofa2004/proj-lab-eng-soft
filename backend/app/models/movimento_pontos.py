# ruff: noqa: E501
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class MovimentoPontos(Base):
    __tablename__ = "movimento_pontos"
    __table_args__ = (
        CheckConstraint("quantidade <> 0", name="ck_movimento_quantidade"),
        CheckConstraint(
            "motivo IN ('leitura', 'inatividade', 'ajuste')", name="ck_movimento_motivo"
        ),
        CheckConstraint(
            "motivo <> 'leitura' OR (id_livro IS NOT NULL AND quantidade > 0)",
            name="ck_movimento_leitura",
        ),
        CheckConstraint(
            "motivo <> 'inatividade' OR (id_livro IS NULL AND quantidade < 0 AND data_referencia IS NOT NULL)",
            name="ck_movimento_inatividade",
        ),
        UniqueConstraint("chave_evento"),
        Index(
            "pontos_recompensa_unica",
            "id_usuario",
            "id_livro",
            unique=True,
            postgresql_where=text("motivo = 'leitura'"),
        ),
        Index(
            "pontos_deducao_diaria",
            "id_usuario",
            "data_referencia",
            unique=True,
            postgresql_where=text("motivo = 'inatividade'"),
        ),
        {"schema": SCHEMA},
    )

    id_movimento: Mapped[int] = primary_key_column()
    id_usuario: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT"), nullable=False
    )
    id_livro: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="RESTRICT")
    )
    quantidade: Mapped[int] = mapped_column(BigInteger, nullable=False)
    motivo: Mapped[str] = mapped_column(String(15), nullable=False)
    data_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
    data_referencia: Mapped[date | None] = mapped_column(Date)
    chave_evento: Mapped[str] = mapped_column(Text, nullable=False)
