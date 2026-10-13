from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class AssetPerfil(Base):
    __tablename__ = "asset_perfil"
    __table_args__ = (
        CheckConstraint("tipo IN ('avatar', 'icone')", name="ck_asset_perfil_tipo"),
        UniqueConstraint("tipo", "nome"),
        {"schema": SCHEMA},
    )

    id_asset: Mapped[int] = primary_key_column()
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    arquivo: Mapped[str] = mapped_column(Text, nullable=False)
    exige_premium: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    id_nivel_minimo: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.nivel.id_nivel", ondelete="RESTRICT")
    )
