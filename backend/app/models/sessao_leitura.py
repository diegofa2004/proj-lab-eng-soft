from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class SessaoLeitura(Base):
    __tablename__ = "sessao_leitura"
    __table_args__ = (
        CheckConstraint("tempo_ativo_segundos >= 0", name="ck_sessao_tempo_ativo"),
        CheckConstraint("fim IS NULL OR fim >= inicio", name="ck_sessao_periodo"),
        {"schema": SCHEMA},
    )

    id_sessao: Mapped[int] = primary_key_column()
    id_usuario: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT"), nullable=False
    )
    id_livro: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="RESTRICT"), nullable=False
    )
    inicio: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
    fim: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    tempo_ativo_segundos: Mapped[int] = mapped_column(
        BigInteger, nullable=False, server_default=text("0")
    )
