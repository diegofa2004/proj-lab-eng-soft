from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    LargeBinary,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA


class CapaLivro(Base):
    """The one cover image associated with a book.

    The shared PostgreSQL database owns the image bytes, so every backend
    connected to it can serve the same cover without a local file volume.
    """

    __tablename__ = "capa_livro"
    __table_args__ = (
        CheckConstraint("btrim(arquivo) <> ''", name="ck_capa_livro_arquivo"),
        CheckConstraint(
            "tipo_mime IN ('image/jpeg', 'image/png', 'image/webp')",
            name="ck_capa_livro_tipo_mime",
        ),
        {"schema": SCHEMA},
    )

    id_livro: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="CASCADE"),
        primary_key=True,
    )
    arquivo: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_mime: Mapped[str] = mapped_column(String(20), nullable=False)
    fonte_url: Mapped[str | None] = mapped_column(Text)
    imagem: Mapped[bytes | None] = mapped_column(LargeBinary)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
