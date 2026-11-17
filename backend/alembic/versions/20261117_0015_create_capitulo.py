"""Create chapter storage for in-app writing.

Revision ID: 20261117_0015
Revises: 20261117_0014
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261117_0015"
down_revision: str | Sequence[str] | None = "20261117_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "capitulo",
        sa.Column(
            "id_capitulo",
            sa.BigInteger(),
            sa.Identity(always=True),
            primary_key=True,
        ),
        sa.Column("id_livro", sa.BigInteger(), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(length=300), nullable=False),
        sa.Column("conteudo", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("versao", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint("ordem > 0", name="ck_capitulo_ordem"),
        sa.CheckConstraint("length(trim(titulo)) > 0", name="ck_capitulo_titulo"),
        sa.CheckConstraint("versao > 0", name="ck_capitulo_versao"),
        sa.CheckConstraint(
            "length(conteudo) <= 1048576", name="ck_capitulo_conteudo_tamanho"
        ),
        sa.ForeignKeyConstraint(
            ["id_livro"], ["plataforma.livro.id_livro"], ondelete="CASCADE"
        ),
        schema="plataforma",
    )
    op.create_index(
        "uq_capitulo_livro_ordem",
        "capitulo",
        ["id_livro", "ordem"],
        unique=True,
        schema="plataforma",
    )
    op.create_index("capitulo_livro", "capitulo", ["id_livro"], schema="plataforma")


def downgrade() -> None:
    op.drop_index("capitulo_livro", table_name="capitulo", schema="plataforma")
    op.drop_index("uq_capitulo_livro_ordem", table_name="capitulo", schema="plataforma")
    op.drop_table("capitulo", schema="plataforma")
