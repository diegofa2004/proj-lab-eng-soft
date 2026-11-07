from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA


class CapaLivro(Base):
    """The one cover image associated with a book.

    Image bytes remain in object/file storage; the database holds the stable
    path and metadata needed to find them.
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
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
