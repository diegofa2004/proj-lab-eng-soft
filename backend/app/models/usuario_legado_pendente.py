"""Legacy users that need manual reconciliation after migration."""

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA


class UsuarioLegadoPendente(Base):
    __tablename__ = "usuario_legado_pendente"
    __table_args__ = {"schema": SCHEMA}

    id_legado: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome_perfil: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
