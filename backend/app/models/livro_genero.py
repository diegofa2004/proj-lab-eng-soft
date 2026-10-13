from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA


class LivroGenero(Base):
    __tablename__ = "livro_genero"
    __table_args__ = ({"schema": SCHEMA},)

    id_livro: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="CASCADE"), primary_key=True
    )
    id_genero: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.genero.id_genero", ondelete="RESTRICT"), primary_key=True
    )
