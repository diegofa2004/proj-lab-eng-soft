from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class ItemLista(Base):
    __tablename__ = "item_lista"
    __table_args__ = (
        CheckConstraint("tipo IN ('favorito', 'ler_depois')", name="ck_item_lista_tipo"),
        UniqueConstraint("id_usuario", "id_livro", "tipo"),
        {"schema": SCHEMA},
    )

    id_item: Mapped[int] = primary_key_column()
    id_usuario: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT"), nullable=False
    )
    id_livro: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="RESTRICT"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(12), nullable=False)
    data_adicao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
