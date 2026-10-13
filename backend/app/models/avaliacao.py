from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class Avaliacao(Base):
    __tablename__ = "avaliacao"
    __table_args__ = (
        CheckConstraint("nota BETWEEN 1 AND 5", name="ck_avaliacao_nota"),
        CheckConstraint(
            "texto_revisao IS NULL OR btrim(texto_revisao) <> ''", name="ck_avaliacao_texto_revisao"
        ),
        UniqueConstraint("id_usuario", "id_livro"),
        {"schema": SCHEMA},
    )

    id_avaliacao: Mapped[int] = primary_key_column()
    id_usuario: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT"), nullable=False
    )
    id_livro: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="RESTRICT"), nullable=False
    )
    nota: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    texto_revisao: Mapped[str | None] = mapped_column(Text)
    data_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
    is_removida: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
