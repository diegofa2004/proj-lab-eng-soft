from sqlalchemy import BigInteger, Boolean, CheckConstraint, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class Nivel(Base):
    __tablename__ = "nivel"
    __table_args__ = (
        CheckConstraint("pontos_minimos >= 0", name="ck_nivel_pontos_minimos"),
        UniqueConstraint("nome"),
        UniqueConstraint("pontos_minimos"),
        {"schema": SCHEMA},
    )

    id_nivel: Mapped[int] = primary_key_column()
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    pontos_minimos: Mapped[int] = mapped_column(BigInteger, nullable=False)
    permite_publicar: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
