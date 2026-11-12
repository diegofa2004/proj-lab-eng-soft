"""Store the illustrated avatar selected for each reader.

Revision ID: 20261112_0012
Revises: 20261112_0011
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261112_0012"
down_revision: str | Sequence[str] | None = "20261112_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuario",
        sa.Column("profile_avatar", sa.String(length=32), nullable=True),
        schema="plataforma",
    )
    op.create_check_constraint(
        "ck_usuario_profile_avatar",
        "usuario",
        "profile_avatar IS NULL OR profile_avatar IN "
        "('editorial-reader', 'researcher', 'literary-guardian', 'astronomer', 'explorer', "
        "'detective', 'romantic-reader', 'academic')",
        schema="plataforma",
    )


def downgrade() -> None:
    raise RuntimeError("Illustrated profile avatars are intentionally retained")
