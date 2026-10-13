from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class Livro(Base):
    __tablename__ = "livro"
    __table_args__ = (
        CheckConstraint("btrim(titulo) <> ''", name="ck_livro_titulo"),
        CheckConstraint("total_paginas > 0", name="ck_livro_total_paginas"),
        CheckConstraint("origem IN ('catalogo', 'usuario')", name="ck_livro_origem"),
        CheckConstraint(
            "status_publicacao IN ('rascunho', 'publicado', 'arquivado')",
            name="ck_livro_status_publicacao",
        ),
        CheckConstraint(
            "origem <> 'usuario' OR id_publicador IS NOT NULL", name="ck_livro_publicador"
        ),
        {"schema": SCHEMA},
    )

    id_livro: Mapped[int] = primary_key_column()
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    data_publicacao: Mapped[date] = mapped_column(Date, nullable=False)
    arquivo_conteudo: Mapped[str] = mapped_column(Text, nullable=False)
    total_paginas: Mapped[int] = mapped_column(Integer, nullable=False)
    origem: Mapped[str] = mapped_column(String(10), nullable=False)
    status_publicacao: Mapped[str] = mapped_column(
        String(15), nullable=False, server_default=text("'rascunho'")
    )
    status_bloqueado: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    id_publicador: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT")
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
