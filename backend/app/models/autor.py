from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class Autor(Base):
    __tablename__ = "autor"
    __table_args__ = (
        CheckConstraint("btrim(nome) <> ''", name="ck_autor_nome"),
        {"schema": SCHEMA},
    )

    id_autor: Mapped[int] = primary_key_column()
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
