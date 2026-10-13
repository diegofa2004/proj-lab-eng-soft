# ruff: noqa: E501
from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.common import SCHEMA, primary_key_column


class AtividadeAdmin(Base):
    __tablename__ = "atividade_admin"
    __table_args__ = (
        CheckConstraint(
            "tipo_acao IN ('bloquear_usuario', 'desbloquear_usuario', 'bloquear_livro', "
            "'desbloquear_livro', 'moderar_avaliacao', 'editar_livro')",
            name="ck_atividade_admin_tipo",
        ),
        CheckConstraint(
            "num_nonnulls(id_usuario_alvo, id_livro_alvo, id_avaliacao_alvo) = 1",
            name="ck_atividade_admin_um_alvo",
        ),
        CheckConstraint(
            "(tipo_acao IN ('bloquear_usuario', 'desbloquear_usuario') AND id_usuario_alvo IS NOT NULL) "
            "OR (tipo_acao IN ('bloquear_livro', 'desbloquear_livro', 'editar_livro') AND id_livro_alvo IS NOT NULL) "
            "OR (tipo_acao = 'moderar_avaliacao' AND id_avaliacao_alvo IS NOT NULL)",
            name="ck_atividade_admin_alvo_tipo",
        ),
        {"schema": SCHEMA},
    )

    id_log: Mapped[int] = primary_key_column()
    id_admin: Mapped[int] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT"), nullable=False
    )
    id_usuario_alvo: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.usuario.id_usuario", ondelete="RESTRICT")
    )
    id_livro_alvo: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.livro.id_livro", ondelete="RESTRICT")
    )
    id_avaliacao_alvo: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey(f"{SCHEMA}.avaliacao.id_avaliacao", ondelete="RESTRICT")
    )
    tipo_acao: Mapped[str] = mapped_column(String(30), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    data_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
