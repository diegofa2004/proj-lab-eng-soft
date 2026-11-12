"""Store standardized reading-page totals and expose them in the dashboard.

Revision ID: 20261112_0009
Revises: 20261110_0008
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261112_0009"
down_revision: str | Sequence[str] | None = "20261110_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "livro", sa.Column("paginas_padrao", sa.Integer(), nullable=True), schema="plataforma"
    )
    op.create_check_constraint(
        "ck_livro_paginas_padrao",
        "livro",
        "paginas_padrao IS NULL OR paginas_padrao > 0",
        schema="plataforma",
    )
    op.execute("DROP VIEW plataforma.v_dashboard_leitura")
    op.execute("""
        CREATE VIEW plataforma.v_dashboard_leitura AS
        SELECT u.id_usuario,
          (SELECT count(*) FROM plataforma.progresso_leitura p WHERE p.id_usuario = u.id_usuario
            AND p.concluido_em IS NOT NULL) AS livros_concluidos,
          coalesce((
            SELECT round(sum(
              least(p.paginas_distintas_lidas, l.total_paginas)::numeric
              * l.paginas_padrao / l.total_paginas
            ))::bigint
            FROM plataforma.progresso_leitura p
            JOIN plataforma.livro l USING(id_livro)
            WHERE p.id_usuario = u.id_usuario AND l.paginas_padrao IS NOT NULL
          ), 0)::bigint AS paginas_padrao_lidas,
          coalesce((SELECT sum(tempo_ativo_segundos) FROM plataforma.sessao_leitura s
            WHERE s.id_usuario = u.id_usuario), 0) AS tempo_ativo_segundos,
          (SELECT count(DISTINCT lg.id_genero) FROM plataforma.progresso_leitura p
            JOIN plataforma.livro_genero lg USING(id_livro) WHERE p.id_usuario = u.id_usuario
              AND (p.paginas_distintas_lidas > 0 OR p.concluido_em IS NOT NULL)) AS generos_lidos,
          (SELECT count(DISTINCT la.id_autor) FROM plataforma.progresso_leitura p
            JOIN plataforma.livro_autor la USING(id_livro) WHERE p.id_usuario = u.id_usuario
              AND (p.paginas_distintas_lidas > 0 OR p.concluido_em IS NOT NULL)) AS autores_lidos
        FROM plataforma.usuario u
    """)


def downgrade() -> None:
    raise RuntimeError("Standard reading pages are intentionally retained")
