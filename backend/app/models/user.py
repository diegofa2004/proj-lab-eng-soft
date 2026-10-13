from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA


class User(Base):
    __tablename__ = "usuario"
    __table_args__ = (
        CheckConstraint("trim(nome_perfil) <> ''", name="ck_usuario_nome_perfil"),
        CheckConstraint(
            "email = lower(btrim(email)) AND position('@' IN email) > 1",
            name="ck_usuario_email_normalizado",
        ).ddl_if(dialect="postgresql"),
        CheckConstraint("trim(senha_hash) <> ''", name="ck_usuario_senha_hash"),
        UniqueConstraint("email"),
        UniqueConstraint("nome_perfil"),
        {"schema": SCHEMA},
    )

    id: Mapped[int] = mapped_column(
        "id_usuario",
        BigInteger().with_variant(Integer, "sqlite"),
        Identity(always=True),
        primary_key=True,
    )
    username: Mapped[str] = mapped_column("nome_perfil", String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    password_hash: Mapped[str] = mapped_column("senha_hash", Text, nullable=False)
    biography: Mapped[str] = mapped_column(
        "biografia", Text, nullable=False, server_default=text("''")
    )
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_blocked: Mapped[bool] = mapped_column(
        "status_bloqueado", Boolean, nullable=False, server_default=text("false")
    )
    last_activity: Mapped[datetime] = mapped_column(
        "ultima_atividade",
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
    )
    created_at: Mapped[datetime] = mapped_column(
        "criado_em",
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
    )
    avatar_id: Mapped[int | None] = mapped_column(
        "id_avatar", BigInteger, ForeignKey(f"{SCHEMA}.asset_perfil.id_asset", ondelete="RESTRICT")
    )
    icon_id: Mapped[int | None] = mapped_column(
        "id_icone", BigInteger, ForeignKey(f"{SCHEMA}.asset_perfil.id_asset", ondelete="RESTRICT")
    )
