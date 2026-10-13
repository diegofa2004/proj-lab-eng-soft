from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA


class LivroAutor(Base):
    __tablename__ = "livro_autor"
    __table_args__ = ({"schema": SCHEMA},)

    id_livro: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="CASCADE"), primary_key=True
    )
    id_autor: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.autor.id_autor", ondelete="RESTRICT"), primary_key=True
    )
