"""Import any remaining legacy users without losing conflicting records.

Revision ID: 20261103_0003
Revises: 20261013_0002
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261103_0003"
down_revision: str | Sequence[str] | None = "20261013_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS plataforma.usuario_legado_pendente (
            id_legado INTEGER PRIMARY KEY,
            nome_perfil VARCHAR(50) NOT NULL,
            email VARCHAR(320) NOT NULL,
            senha_hash VARCHAR(255) NOT NULL
        );
        DO $$ BEGIN
          IF to_regclass('public.users') IS NOT NULL THEN
            INSERT INTO plataforma.usuario_legado_pendente
              (id_legado, nome_perfil, email, senha_hash)
            SELECT id, username, email, password_hash FROM public.users WHERE true
            ON CONFLICT (id_legado) DO NOTHING;
            WITH candidates AS (
              SELECT *, row_number() OVER (
                PARTITION BY lower(btrim(email)) ORDER BY id_legado
              ) AS rank
              FROM plataforma.usuario_legado_pendente
            )
            INSERT INTO plataforma.usuario(nome_perfil, email, senha_hash)
            SELECT nome_perfil, lower(btrim(email)), senha_hash FROM candidates
            WHERE rank = 1 AND length(lower(btrim(email))) <= 254
              AND position('@' IN lower(btrim(email))) > 1
              AND btrim(nome_perfil) <> '' AND btrim(senha_hash) <> ''
            ON CONFLICT DO NOTHING;
            DELETE FROM plataforma.usuario_legado_pendente a USING plataforma.usuario u
            WHERE a.nome_perfil = u.nome_perfil AND lower(btrim(a.email)) = u.email
              AND a.senha_hash = u.senha_hash;
            DROP TABLE public.users;
          END IF;
        END $$;
    """)


def downgrade() -> None:
    raise RuntimeError("Legacy user reconciliation is irreversible. Restore a PostgreSQL backup.")
