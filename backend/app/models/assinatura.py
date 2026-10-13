from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
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


class Assinatura(Base):
    __tablename__ = "assinatura"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pendente', 'ativa', 'cancelada', 'expirada')", name="ck_assinatura_status"
        ),
        CheckConstraint("fim IS NULL OR fim > inicio", name="ck_assinatura_periodo"),
        CheckConstraint("status <> 'ativa' OR fim IS NOT NULL", name="ck_assinatura_ativa_fim"),
        UniqueConstraint("referencia_provedor"),
        Index(
            "assinatura_ativa_usuario",
            "id_usuario",
            unique=True,
            postgresql_where=text("status = 'ativa'"),
        ),
        {"schema": SCHEMA},
    )

    id_assinatura: Mapped[int] = primary_key_column()
    id_usuario: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT"), nullable=False
    )
    id_plano: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.plano.id_plano", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(12), nullable=False, server_default=text("'pendente'")
    )
    inicio: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
    fim: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    referencia_provedor: Mapped[str | None] = mapped_column(Text)
