from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA


class LivroGeneroCanonico(Base):
    __tablename__ = "livro_genero_canonico"
    __table_args__ = (
        CheckConstraint(
            "confianca >= 0 AND confianca <= 1", name="ck_livro_genero_canonico_confianca"
        ),
        CheckConstraint(
            "origem IN ('automatico', 'manual')", name="ck_livro_genero_canonico_origem"
        ),
        {"schema": SCHEMA},
    )

    id_livro: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="CASCADE"), primary_key=True
    )
    id_genero_canonico: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.genero_canonico.id_genero_canonico", ondelete="CASCADE"),
        primary_key=True,
    )
    confianca: Mapped[float] = mapped_column(Float, nullable=False)
    origem: Mapped[str] = mapped_column(
        String(12), nullable=False, server_default=text("'automatico'")
    )
    principal: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    classificado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
