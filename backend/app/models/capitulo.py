from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column

MAX_CAPITULO_BYTES = 1024 * 1024


class Capitulo(Base):
    __tablename__ = "capitulo"
    __table_args__ = (
        CheckConstraint("ordem > 0", name="ck_capitulo_ordem"),
        CheckConstraint("length(trim(titulo)) > 0", name="ck_capitulo_titulo"),
        CheckConstraint("versao > 0", name="ck_capitulo_versao"),
        CheckConstraint(
            f"length(conteudo) <= {MAX_CAPITULO_BYTES}", name="ck_capitulo_conteudo_tamanho"
        ),
        Index("uq_capitulo_livro_ordem", "id_livro", "ordem", unique=True),
        Index("capitulo_livro", "id_livro"),
        {"schema": SCHEMA},
    )

    id_capitulo: Mapped[int] = primary_key_column()
    id_livro: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="CASCADE"),
        nullable=False,
    )
    ordem: Mapped[int] = mapped_column(Integer, nullable=False)
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    conteudo: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    versao: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
