"""Store the decorative ring chosen for each reader profile.

Revision ID: 20261112_0010
Revises: 20261112_0009
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261112_0010"
down_revision: str | Sequence[str] | None = "20261112_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuario",
        sa.Column("profile_ring", sa.String(length=32), nullable=True),
        schema="plataforma",
    )
    op.create_check_constraint(
        "ck_usuario_profile_ring",
        "usuario",
        "profile_ring IS NULL OR profile_ring IN "
        "('subscriber', 'bronze', 'diamond', 'emerald', 'master', 'gold', 'silver', 'publisher')",
        schema="plataforma",
    )


def downgrade() -> None:
    raise RuntimeError("Profile ring selections are intentionally retained")
