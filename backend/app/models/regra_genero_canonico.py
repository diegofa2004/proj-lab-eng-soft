from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Float,
    ForeignKey,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class RegraGeneroCanonico(Base):
    __tablename__ = "regra_genero_canonico"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('exact', 'contains', 'starts_with', 'ends_with')",
            name="ck_regra_genero_canonico_tipo",
        ),
        CheckConstraint("btrim(padrao) <> ''", name="ck_regra_genero_canonico_padrao"),
        CheckConstraint("peso > 0 AND peso <= 1", name="ck_regra_genero_canonico_peso"),
        {"schema": SCHEMA},
    )

    id_regra: Mapped[int] = primary_key_column()
    id_genero_canonico: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.genero_canonico.id_genero_canonico", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'contains'"))
    padrao: Mapped[str] = mapped_column(String(200), nullable=False)
    peso: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("1"))
    prioridade: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
