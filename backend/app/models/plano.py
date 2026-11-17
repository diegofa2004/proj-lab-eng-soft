from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Numeric, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class Plano(Base):
    __tablename__ = "plano"
    __table_args__ = (
        CheckConstraint("preco >= 0", name="ck_plano_preco"),
        CheckConstraint("periodicidade IN ('mensal', 'anual')", name="ck_plano_periodicidade"),
        CheckConstraint(
            "tier IN ('individual', 'family_and_friends')", name="ck_plano_tier"
        ),
        CheckConstraint("max_members >= 1", name="ck_plano_max_members"),
        CheckConstraint(
            "(tier = 'individual' AND max_members = 1 AND NOT requires_adult_holder) OR "
            "(tier = 'family_and_friends' AND max_members BETWEEN 2 AND 4 "
            "AND requires_adult_holder)",
            name="ck_plano_family_configuration",
        ),
        UniqueConstraint("nome"),
        {"schema": SCHEMA},
    )

    id_plano: Mapped[int] = primary_key_column()
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    preco: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    moeda: Mapped[str] = mapped_column(String(3), nullable=False, server_default=text("'BRL'"))
    periodicidade: Mapped[str] = mapped_column(String(10), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    tier: Mapped[str] = mapped_column(
        String(24), nullable=False, server_default=text("'individual'")
    )
    max_members: Mapped[int] = mapped_column(nullable=False, server_default=text("1"))
    requires_adult_holder: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
