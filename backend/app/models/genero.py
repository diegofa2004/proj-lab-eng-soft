from sqlalchemy import CheckConstraint, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class Genero(Base):
    __tablename__ = "genero"
    __table_args__ = (
        CheckConstraint("btrim(nome) <> ''", name="ck_genero_nome"),
        Index("genero_nome_ci", func.lower(text("nome")), unique=True),
        {"schema": SCHEMA},
    )

    id_genero: Mapped[int] = primary_key_column()
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
