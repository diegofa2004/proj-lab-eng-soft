from sqlalchemy import Boolean, CheckConstraint, Index, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class GeneroCanonico(Base):
    __tablename__ = "genero_canonico"
    __table_args__ = (
        CheckConstraint("btrim(nome) <> ''", name="ck_genero_canonico_nome"),
        CheckConstraint("btrim(slug) <> ''", name="ck_genero_canonico_slug"),
        Index("genero_canonico_nome_ci", func.lower(text("nome")), unique=True),
        Index("genero_canonico_slug_ci", func.lower(text("slug")), unique=True),
        {"schema": SCHEMA},
    )

    id_genero_canonico: Mapped[int] = primary_key_column()
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    ordem_exibicao: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
