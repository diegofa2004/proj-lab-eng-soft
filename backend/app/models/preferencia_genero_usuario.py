from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA


class PreferenciaGeneroUsuario(Base):
    __tablename__ = "preferencia_genero_usuario"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('interesse', 'nao_interessa')",
            name="ck_preferencia_genero_usuario_tipo",
        ),
        {"schema": SCHEMA},
    )

    id_usuario: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="CASCADE"),
        primary_key=True,
    )
    id_genero_canonico: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(f"{SCHEMA}.genero_canonico.id_genero_canonico", ondelete="CASCADE"),
        primary_key=True,
    )
    tipo: Mapped[str] = mapped_column(String(16), nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
