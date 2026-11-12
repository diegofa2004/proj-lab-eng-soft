"""Store the background theme selected for each reader.

Revision ID: 20261112_0011
Revises: 20261112_0010
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261112_0011"
down_revision: str | Sequence[str] | None = "20261112_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "usuario",
        sa.Column("profile_background", sa.String(length=32), nullable=True),
        schema="plataforma",
    )
    op.create_check_constraint(
        "ck_usuario_profile_background",
        "usuario",
        "profile_background IS NULL OR profile_background IN "
        "('editorial-paper', 'abstract-pages', 'dark-library', 'cosmic-library', "
        "'literary-watercolor', 'noir-detective', 'romance', 'academic-education')",
        schema="plataforma",
    )


def downgrade() -> None:
    raise RuntimeError("Profile background selections are intentionally retained")
