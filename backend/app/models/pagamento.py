from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class Pagamento(Base):
    __tablename__ = "pagamento"
    __table_args__ = (
        CheckConstraint("valor >= 0", name="ck_pagamento_valor"),
        CheckConstraint(
            "status IN ('pendente', 'aprovado', 'recusado', 'estornado')",
            name="ck_pagamento_status",
        ),
        UniqueConstraint("referencia_provedor"),
        {"schema": SCHEMA},
    )

    id_pagamento: Mapped[int] = primary_key_column()
    id_assinatura: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.assinatura.id_assinatura", ondelete="RESTRICT"),
        nullable=False,
    )
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    moeda: Mapped[str] = mapped_column(String(3), nullable=False, server_default=text("'BRL'"))
    status: Mapped[str] = mapped_column(
        String(12), nullable=False, server_default=text("'pendente'")
    )
    data_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
    referencia_provedor: Mapped[str | None] = mapped_column(Text)
