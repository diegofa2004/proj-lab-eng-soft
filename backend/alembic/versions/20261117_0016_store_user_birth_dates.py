"""Store birth dates on reader accounts for Family plan eligibility.

Revision ID: 20261117_0016
Revises: 20261117_0015
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261117_0016"
down_revision: str | Sequence[str] | None = "20261117_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuario",
        sa.Column("data_nascimento", sa.Date(), nullable=True),
        schema="plataforma",
    )
    # Historic accounts predate birth-date collection.  Mark them as adults
    # so the new Family eligibility rule does not break existing readers.
    op.execute(
        """
        UPDATE plataforma.usuario
        SET data_nascimento = CURRENT_DATE - INTERVAL '18 years'
        WHERE data_nascimento IS NULL
        """
    )
    op.alter_column("usuario", "data_nascimento", nullable=False, schema="plataforma")


def downgrade() -> None:
    raise RuntimeError("Birth dates are retained to preserve Family plan eligibility")
