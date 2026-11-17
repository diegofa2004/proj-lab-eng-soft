"""Make Family and Friends subscriptions a first-class backend feature.

Revision ID: 20261117_0013
Revises: 20261112_0012
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261117_0013"
down_revision: str | Sequence[str] | None = "20261112_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "plano",
        sa.Column(
            "tier", sa.String(length=24), nullable=False, server_default=sa.text("'individual'")
        ),
        schema="plataforma",
    )
    op.add_column(
        "plano",
        sa.Column("max_members", sa.Integer(), nullable=False, server_default="1"),
        schema="plataforma",
    )
    op.add_column(
        "plano",
        sa.Column(
            "requires_adult_holder", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        schema="plataforma",
    )
    op.create_check_constraint(
        "ck_plano_tier",
        "plano",
        "tier IN ('individual', 'family_and_friends')",
        schema="plataforma",
    )
    op.create_check_constraint(
        "ck_plano_max_members", "plano", "max_members >= 1", schema="plataforma"
    )
    op.create_check_constraint(
        "ck_plano_family_configuration",
        "plano",
        "(tier = 'individual' AND max_members = 1 AND NOT requires_adult_holder) OR "
        "(tier = 'family_and_friends' AND max_members BETWEEN 2 AND 4 AND requires_adult_holder)",
        schema="plataforma",
    )
    op.add_column(
        "assinatura",
        sa.Column("titular_adulto_confirmado_em", sa.DateTime(timezone=True), nullable=True),
        schema="plataforma",
    )
    op.create_table(
        "assinatura_membro",
        sa.Column("id_assinatura", sa.BigInteger(), nullable=False),
        sa.Column("id_usuario", sa.BigInteger(), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(
            ["id_assinatura"], ["plataforma.assinatura.id_assinatura"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["id_usuario"], ["plataforma.usuario.id_usuario"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id_assinatura", "id_usuario"),
        schema="plataforma",
    )
    op.create_index(
        "assinatura_membro_usuario", "assinatura_membro", ["id_usuario"], schema="plataforma"
    )
    op.execute(
        """
        INSERT INTO plataforma.plano
          (nome, preco, moeda, periodicidade, ativo, tier, max_members, requires_adult_holder)
        VALUES
          ('LivrUSP Premium Family and Friends', 29.90, 'BRL', 'mensal', true,
           'family_and_friends', 4, true)
        ON CONFLICT (nome) DO UPDATE SET
          preco = EXCLUDED.preco,
          moeda = EXCLUDED.moeda,
          periodicidade = EXCLUDED.periodicidade,
          ativo = EXCLUDED.ativo,
          tier = EXCLUDED.tier,
          max_members = EXCLUDED.max_members,
          requires_adult_holder = EXCLUDED.requires_adult_holder
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW plataforma.v_perfil_usuario AS
        SELECT u.id_usuario, u.nome_perfil, u.is_admin, u.status_bloqueado,
          coalesce(p.saldo, 0) AS pontos_leitura, n.id_nivel, n.nome AS nivel,
          (
            EXISTS(
              SELECT 1 FROM plataforma.assinatura a
              WHERE a.id_usuario = u.id_usuario AND a.status = 'ativa'
                AND a.inicio <= CURRENT_TIMESTAMP AND a.fim > CURRENT_TIMESTAMP
            )
            OR EXISTS(
              SELECT 1 FROM plataforma.assinatura_membro am
              JOIN plataforma.assinatura a ON a.id_assinatura = am.id_assinatura
              WHERE am.id_usuario = u.id_usuario AND a.status = 'ativa'
                AND a.inicio <= CURRENT_TIMESTAMP AND a.fim > CURRENT_TIMESTAMP
            )
          ) AS is_premium,
          NOT u.status_bloqueado AND (
            coalesce(n.permite_publicar, false) OR EXISTS(
              SELECT 1 FROM plataforma.assinatura a
              WHERE a.id_usuario = u.id_usuario AND a.status = 'ativa'
                AND a.inicio <= CURRENT_TIMESTAMP AND a.fim > CURRENT_TIMESTAMP
            ) OR EXISTS(
              SELECT 1 FROM plataforma.assinatura_membro am
              JOIN plataforma.assinatura a ON a.id_assinatura = am.id_assinatura
              WHERE am.id_usuario = u.id_usuario AND a.status = 'ativa'
                AND a.inicio <= CURRENT_TIMESTAMP AND a.fim > CURRENT_TIMESTAMP
            )
          ) AS pode_publicar
        FROM plataforma.usuario u
        LEFT JOIN (
          SELECT id_usuario, sum(quantidade) AS saldo
          FROM plataforma.movimento_pontos GROUP BY id_usuario
        ) p ON p.id_usuario = u.id_usuario
        LEFT JOIN LATERAL (
          SELECT * FROM plataforma.nivel
          WHERE pontos_minimos <= greatest(coalesce(p.saldo, 0), 0)
          ORDER BY pontos_minimos DESC LIMIT 1
        ) n ON true
        """
    )


def downgrade() -> None:
    raise RuntimeError("Family subscription records are intentionally retained")
