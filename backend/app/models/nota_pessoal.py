from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class NotaPessoal(Base):
    __tablename__ = "nota_pessoal"
    __table_args__ = (
        CheckConstraint("btrim(texto) <> ''", name="ck_nota_pessoal_texto"),
        {"schema": SCHEMA},
    )

    id_nota: Mapped[int] = primary_key_column()
    id_usuario: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT"), nullable=False
    )
    id_livro: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="RESTRICT"), nullable=False
    )
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    localizacao: Mapped[str | None] = mapped_column(Text)
    data_criacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
    data_atualizacao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
