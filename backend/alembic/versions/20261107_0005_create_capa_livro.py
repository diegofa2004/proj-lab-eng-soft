"""Create the book-cover image association.

Revision ID: 20261107_0005
Revises: 20261103_0004
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261107_0005"
down_revision: str | Sequence[str] | None = "20261103_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "capa_livro",
        sa.Column("id_livro", sa.BigInteger(), nullable=False),
        sa.Column("arquivo", sa.Text(), nullable=False),
        sa.Column("tipo_mime", sa.String(length=20), nullable=False),
        sa.Column("fonte_url", sa.Text(), nullable=True),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint("btrim(arquivo) <> ''", name="ck_capa_livro_arquivo"),
        sa.CheckConstraint(
            "tipo_mime IN ('image/jpeg', 'image/png', 'image/webp')",
            name="ck_capa_livro_tipo_mime",
        ),
        sa.ForeignKeyConstraint(["id_livro"], ["plataforma.livro.id_livro"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id_livro"),
        schema="plataforma",
    )


def downgrade() -> None:
    raise RuntimeError("Do not remove book-cover data through a downgrade")
