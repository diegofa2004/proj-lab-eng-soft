"""Ensure the two public Premium subscription plans exist.

Revision ID: 20261117_0015
Revises: 20261117_0014
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20261117_0015"
down_revision: str | Sequence[str] | None = "20261117_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # These names are stable public offerings.  The upserts make fresh and
    # already-populated databases converge without changing subscription IDs.
    op.execute(
        """
        INSERT INTO plataforma.plano
          (nome, preco, moeda, periodicidade, ativo, tier, max_members, requires_adult_holder)
        VALUES
          ('LivrUSP Premium Individual', 9.90, 'BRL', 'mensal', true,
           'individual', 1, false)
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


def downgrade() -> None:
    raise RuntimeError("Subscription plans are retained to preserve purchase history")
