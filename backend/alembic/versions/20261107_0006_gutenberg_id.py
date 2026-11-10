"""Store the Project Gutenberg identifier independently from the synopsis.

Revision ID: 20261107_0006
Revises: 20261107_0005
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261107_0006"
down_revision: str | Sequence[str] | None = "20261107_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "livro", sa.Column("gutenberg_id", sa.BigInteger(), nullable=True), schema="plataforma"
    )
    op.execute(
        """
        UPDATE plataforma.livro
        SET gutenberg_id = substring(descricao from 'Project Gutenberg ebook #([0-9]+)')::bigint
        WHERE descricao LIKE 'Fonte: Project Gutenberg ebook #%'
        """
    )
    op.create_unique_constraint(
        "uq_livro_gutenberg_id", "livro", ["gutenberg_id"], schema="plataforma"
    )


def downgrade() -> None:
    raise RuntimeError("Do not remove Gutenberg identifiers through a downgrade")
