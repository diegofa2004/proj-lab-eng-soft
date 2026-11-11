"""Store onboarding genre interests and exclusions per reader.

Revision ID: 20261110_0008
Revises: 20261110_0007
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261110_0008"
down_revision: str | Sequence[str] | None = "20261110_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuario",
        sa.Column(
            "onboarding_generos_concluido",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        schema="plataforma",
    )
    # Existing accounts keep their current experience; accounts created after this migration
    # complete the preference step on their first sign-in.
    op.execute("UPDATE plataforma.usuario SET onboarding_generos_concluido = true")
    op.create_table(
        "preferencia_genero_usuario",
        sa.Column(
            "id_usuario",
            sa.BigInteger(),
            sa.ForeignKey("plataforma.usuario.id_usuario", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "id_genero_canonico",
            sa.BigInteger(),
            sa.ForeignKey("plataforma.genero_canonico.id_genero_canonico", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("tipo", sa.String(16), nullable=False),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.current_timestamp(),
        ),
        sa.CheckConstraint(
            "tipo IN ('interesse', 'nao_interessa')",
            name="ck_preferencia_genero_usuario_tipo",
        ),
        schema="plataforma",
    )
    op.create_index(
        "preferencia_genero_usuario_usuario_tipo",
        "preferencia_genero_usuario",
        ["id_usuario", "tipo"],
        schema="plataforma",
    )


def downgrade() -> None:
    raise RuntimeError("Do not remove reader preferences through a downgrade")
