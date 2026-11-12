"""Add persistent canonical genres and configurable classification rules.

Revision ID: 20261110_0007
Revises: 20261107_0006
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261110_0007"
down_revision: str | Sequence[str] | None = "20261107_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

GENRES = [
    ("literary-fiction", "Literary Fiction"),
    ("romance", "Romance"),
    ("mystery-detective", "Mystery & Detective"),
    ("thriller-suspense", "Thriller & Suspense"),
    ("horror", "Horror"),
    ("fantasy", "Fantasy"),
    ("science-fiction", "Science Fiction"),
    ("historical-fiction", "Historical Fiction"),
    ("adventure", "Adventure"),
    ("humor-satire", "Humor & Satire"),
    ("short-stories", "Short Stories"),
    ("children-young-adult", "Children & Young Adult"),
    ("poetry", "Poetry"),
    ("drama-plays", "Drama & Plays"),
    ("biography-memoir", "Biography & Memoir"),
    ("history", "History"),
    ("philosophy", "Philosophy"),
    ("religion-spirituality", "Religion & Spirituality"),
    ("politics-society", "Politics & Society"),
    ("science-mathematics", "Science & Mathematics"),
]

RULES = {
    "literary-fiction": ["psychological fiction", "bildungsroman", "domestic fiction", "fiction"],
    "romance": ["love stories", "romance fiction", "courtship", "man-woman relationships"],
    "mystery-detective": ["detective", "mystery", "private investigator", "sherlock holmes"],
    "thriller-suspense": ["thriller", "suspense", "espionage", "spy stories"],
    "horror": ["horror", "gothic fiction", "ghost stories", "vampires", "supernatural"],
    "fantasy": ["fantasy", "fairy tales", "magic", "mythical animals"],
    "science-fiction": ["science fiction", "dystopian", "robots", "interplanetary", "space travel"],
    "historical-fiction": ["historical fiction", "war stories"],
    "adventure": ["adventure stories", "sea stories", "voyages", "pirates"],
    "humor-satire": ["humorous stories", "satire", "wit and humor", "parodies"],
    "short-stories": ["short stories"],
    "children-young-adult": [
        "juvenile fiction",
        "juvenile literature",
        "children's stories",
        "young adult",
    ],
    "poetry": ["poetry", "poems"],
    "drama-plays": ["drama", "plays", "tragedies", "comedies"],
    "biography-memoir": ["biography", "autobiography", "memoirs", "personal narratives"],
    "history": ["history", "civilization"],
    "philosophy": ["philosophy", "ethics", "conduct of life", "stoicism"],
    "religion-spirituality": ["religion", "christian", "bible", "theology", "spirituality"],
    "politics-society": [
        "political science",
        "politics",
        "social sciences",
        "economics",
        "civil disobedience",
    ],
    "science-mathematics": [
        "science",
        "mathematics",
        "physics",
        "chemistry",
        "astronomy",
        "calculus",
    ],
}


def upgrade() -> None:
    op.create_table(
        "genero_canonico",
        sa.Column(
            "id_genero_canonico", sa.BigInteger(), sa.Identity(always=True), primary_key=True
        ),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("nome", sa.String(100), nullable=False),
        sa.Column("descricao", sa.Text(), server_default="", nullable=False),
        sa.Column("ordem_exibicao", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.CheckConstraint("btrim(nome) <> ''", name="ck_genero_canonico_nome"),
        sa.CheckConstraint("btrim(slug) <> ''", name="ck_genero_canonico_slug"),
        schema="plataforma",
    )
    op.create_index(
        "genero_canonico_nome_ci",
        "genero_canonico",
        [sa.text("lower(nome)")],
        unique=True,
        schema="plataforma",
    )
    op.create_index(
        "genero_canonico_slug_ci",
        "genero_canonico",
        [sa.text("lower(slug)")],
        unique=True,
        schema="plataforma",
    )
    op.create_table(
        "regra_genero_canonico",
        sa.Column("id_regra", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column(
            "id_genero_canonico",
            sa.BigInteger(),
            sa.ForeignKey("plataforma.genero_canonico.id_genero_canonico", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tipo", sa.String(20), server_default="contains", nullable=False),
        sa.Column("padrao", sa.String(200), nullable=False),
        sa.Column("peso", sa.Float(), server_default="1", nullable=False),
        sa.Column("prioridade", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ativo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.CheckConstraint(
            "tipo IN ('exact', 'contains', 'starts_with', 'ends_with')",
            name="ck_regra_genero_canonico_tipo",
        ),
        sa.CheckConstraint("btrim(padrao) <> ''", name="ck_regra_genero_canonico_padrao"),
        sa.CheckConstraint("peso > 0 AND peso <= 1", name="ck_regra_genero_canonico_peso"),
        schema="plataforma",
    )
    op.create_index(
        "ix_regra_genero_canonico_id_genero_canonico",
        "regra_genero_canonico",
        ["id_genero_canonico"],
        schema="plataforma",
    )
    op.create_table(
        "livro_genero_canonico",
        sa.Column(
            "id_livro",
            sa.BigInteger(),
            sa.ForeignKey("plataforma.livro.id_livro", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "id_genero_canonico",
            sa.BigInteger(),
            sa.ForeignKey("plataforma.genero_canonico.id_genero_canonico", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("confianca", sa.Float(), nullable=False),
        sa.Column("origem", sa.String(12), server_default="automatico", nullable=False),
        sa.Column("principal", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column(
            "classificado_em",
            sa.DateTime(timezone=True),
            server_default=sa.func.current_timestamp(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "confianca >= 0 AND confianca <= 1", name="ck_livro_genero_canonico_confianca"
        ),
        sa.CheckConstraint(
            "origem IN ('automatico', 'manual')", name="ck_livro_genero_canonico_origem"
        ),
        schema="plataforma",
    )
    genre_table = sa.table(
        "genero_canonico",
        sa.column("slug"),
        sa.column("nome"),
        sa.column("ordem_exibicao"),
        schema="plataforma",
    )
    op.bulk_insert(
        genre_table,
        [
            {"slug": slug, "nome": name, "ordem_exibicao": index}
            for index, (slug, name) in enumerate(GENRES, 1)
        ],
    )
    connection = op.get_bind()
    for slug, patterns in RULES.items():
        for pattern in patterns:
            weight = 0.2 if pattern == "fiction" else 0.85
            connection.execute(
                sa.text("""
                INSERT INTO plataforma.regra_genero_canonico
                    (id_genero_canonico, tipo, padrao, peso, prioridade)
                SELECT id_genero_canonico, 'contains', :pattern, :weight, :priority
                FROM plataforma.genero_canonico WHERE slug = :slug
            """),
                {
                    "slug": slug,
                    "pattern": pattern,
                    "weight": weight,
                    "priority": 100 if weight > 0.2 else 0,
                },
            )


def downgrade() -> None:
    op.drop_table("livro_genero_canonico", schema="plataforma")
    op.drop_table("regra_genero_canonico", schema="plataforma")
    op.drop_table("genero_canonico", schema="plataforma")
