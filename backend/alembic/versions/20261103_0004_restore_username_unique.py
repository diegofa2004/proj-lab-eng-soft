"""Restore username uniqueness on databases that lost the original constraint.

Revision ID: 20261103_0004
Revises: 20261103_0003
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261103_0004"
down_revision: str | Sequence[str] | None = "20261103_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            WHERE c.conrelid = 'plataforma.usuario'::regclass
              AND c.contype = 'u'
              AND pg_get_constraintdef(c.oid) = 'UNIQUE (nome_perfil)'
          ) THEN
            ALTER TABLE plataforma.usuario
              ADD CONSTRAINT usuario_nome_perfil_key UNIQUE (nome_perfil);
          END IF;
        END $$;
    """)


def downgrade() -> None:
    raise RuntimeError("Do not remove the username uniqueness constraint")
