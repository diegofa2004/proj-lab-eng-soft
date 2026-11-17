"""Store book-cover image bytes in the shared database.

Revision ID: 20261117_0014
Revises: 20261117_0013
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261117_0014"
down_revision: str | Sequence[str] | None = "20261117_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable while existing local Docker-volume files are copied by the
    # resumable migration script. New imports always populate this column.
    op.add_column(
        "capa_livro",
        sa.Column("imagem", sa.LargeBinary(), nullable=True),
        schema="plataforma",
    )


def downgrade() -> None:
    raise RuntimeError("Book-cover image data is intentionally retained")
