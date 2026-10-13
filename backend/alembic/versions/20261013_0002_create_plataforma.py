# ruff: noqa: E501
"""create book distribution platform

Revision ID: 20261013_0002
Revises: 20260921_0001
Create Date: 2026-10-13 00:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.models.acesso_livro import AcessoLivro
from app.models.asset_perfil import AssetPerfil
from app.models.assinatura import Assinatura
from app.models.atividade_admin import AtividadeAdmin
from app.models.autor import Autor
from app.models.avaliacao import Avaliacao
from app.models.common import SCHEMA
from app.models.genero import Genero
from app.models.item_lista import ItemLista
from app.models.livro import Livro
from app.models.livro_autor import LivroAutor
from app.models.livro_genero import LivroGenero
from app.models.movimento_pontos import MovimentoPontos
from app.models.nivel import Nivel
from app.models.nota_pessoal import NotaPessoal
from app.models.pagamento import Pagamento
from app.models.plano import Plano
from app.models.progresso_leitura import ProgressoLeitura
from app.models.sessao_leitura import SessaoLeitura
from app.models.user import User

revision: str = "20261013_0002"
down_revision: str | Sequence[str] | None = "20260921_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = (
    Nivel.__table__,
    AssetPerfil.__table__,
    User.__table__,
    Autor.__table__,
    Genero.__table__,
    Livro.__table__,
    LivroAutor.__table__,
    LivroGenero.__table__,
    Avaliacao.__table__,
    ItemLista.__table__,
    NotaPessoal.__table__,
    ProgressoLeitura.__table__,
    SessaoLeitura.__table__,
    AcessoLivro.__table__,
    Plano.__table__,
    Assinatura.__table__,
    Pagamento.__table__,
    MovimentoPontos.__table__,
    AtividadeAdmin.__table__,
)


def upgrade() -> None:
    bind = op.get_bind()
    op.execute(sa.schema.CreateSchema(SCHEMA))
    op.execute(sa.text("DROP TABLE IF EXISTS public.users"))
    for table in TABLES:
        table.create(bind)

    op.execute(
        """
        CREATE FUNCTION plataforma.validar_assets_usuario() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.id_avatar IS NOT NULL AND NOT EXISTS
            (SELECT 1 FROM plataforma.asset_perfil WHERE id_asset = NEW.id_avatar AND tipo = 'avatar') THEN
            RAISE EXCEPTION 'id_avatar deve apontar para um avatar';
          END IF;
          IF NEW.id_icone IS NOT NULL AND NOT EXISTS
            (SELECT 1 FROM plataforma.asset_perfil WHERE id_asset = NEW.id_icone AND tipo = 'icone') THEN
            RAISE EXCEPTION 'id_icone deve apontar para um icone';
          END IF;
          RETURN NEW;
        END; $$;
        CREATE TRIGGER usuario_validar_assets BEFORE INSERT OR UPDATE OF id_avatar, id_icone
          ON plataforma.usuario FOR EACH ROW EXECUTE FUNCTION plataforma.validar_assets_usuario();

        CREATE FUNCTION plataforma.manter_tipo_asset() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
            RAISE EXCEPTION 'Tipo do asset e imutavel';
          END IF;
          RETURN NEW;
        END; $$;
        CREATE TRIGGER asset_tipo_imutavel BEFORE UPDATE OF tipo ON plataforma.asset_perfil
          FOR EACH ROW EXECUTE FUNCTION plataforma.manter_tipo_asset();

        CREATE FUNCTION plataforma.validar_admin_log() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM plataforma.usuario
            WHERE id_usuario = NEW.id_admin AND is_admin AND NOT status_bloqueado
          ) THEN
            RAISE EXCEPTION 'Acao exige administrador ativo';
          END IF;
          RETURN NEW;
        END; $$;
        CREATE TRIGGER log_validar_admin BEFORE INSERT ON plataforma.atividade_admin
          FOR EACH ROW EXECUTE FUNCTION plataforma.validar_admin_log();

        CREATE FUNCTION plataforma.atualizar_data_nota() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          NEW.data_atualizacao = CURRENT_TIMESTAMP;
          RETURN NEW;
        END; $$;
        CREATE TRIGGER nota_atualizada BEFORE UPDATE ON plataforma.nota_pessoal
          FOR EACH ROW EXECUTE FUNCTION plataforma.atualizar_data_nota();
        """
    )

    op.execute(
        """
        CREATE INDEX livro_titulo_busca ON plataforma.livro USING gin(to_tsvector('simple', titulo));
        CREATE INDEX autor_nome_busca ON plataforma.autor USING gin(to_tsvector('simple', nome));
        CREATE INDEX livro_data_publicacao ON plataforma.livro(data_publicacao);
        CREATE INDEX livro_publicador ON plataforma.livro(id_publicador);
        CREATE INDEX livro_autor_autor ON plataforma.livro_autor(id_autor, id_livro);
        CREATE INDEX livro_genero_genero ON plataforma.livro_genero(id_genero, id_livro);
        CREATE INDEX avaliacao_livro ON plataforma.avaliacao(id_livro) WHERE NOT is_removida;
        CREATE INDEX item_lista_livro ON plataforma.item_lista(id_livro);
        CREATE INDEX nota_usuario_livro ON plataforma.nota_pessoal(id_usuario, id_livro);
        CREATE INDEX nota_livro ON plataforma.nota_pessoal(id_livro);
        CREATE INDEX progresso_livro ON plataforma.progresso_leitura(id_livro);
        CREATE INDEX sessao_usuario_inicio ON plataforma.sessao_leitura(id_usuario, inicio DESC);
        CREATE INDEX sessao_livro ON plataforma.sessao_leitura(id_livro);
        CREATE INDEX acesso_livro_data ON plataforma.acesso_livro(id_livro, data_hora DESC);
        CREATE INDEX acesso_usuario ON plataforma.acesso_livro(id_usuario);
        CREATE INDEX assinatura_plano ON plataforma.assinatura(id_plano);
        CREATE INDEX pagamento_assinatura ON plataforma.pagamento(id_assinatura);
        CREATE INDEX movimento_usuario_data ON plataforma.movimento_pontos(id_usuario, data_hora DESC);
        CREATE INDEX movimento_livro ON plataforma.movimento_pontos(id_livro);
        CREATE INDEX log_admin_data ON plataforma.atividade_admin(id_admin, data_hora DESC);
        CREATE INDEX log_usuario_alvo ON plataforma.atividade_admin(id_usuario_alvo);
        CREATE INDEX log_livro_alvo ON plataforma.atividade_admin(id_livro_alvo);
        CREATE INDEX log_avaliacao_alvo ON plataforma.atividade_admin(id_avaliacao_alvo);
        CREATE INDEX asset_nivel ON plataforma.asset_perfil(id_nivel_minimo);
        """
    )

    op.execute(
        """
        CREATE VIEW plataforma.v_perfil_usuario AS
        SELECT u.id_usuario, u.nome_perfil, u.is_admin, u.status_bloqueado,
          coalesce(p.saldo, 0) AS pontos_leitura, n.id_nivel, n.nome AS nivel,
          EXISTS(SELECT 1 FROM plataforma.assinatura a WHERE a.id_usuario = u.id_usuario
            AND a.status = 'ativa' AND a.inicio <= CURRENT_TIMESTAMP AND a.fim > CURRENT_TIMESTAMP) AS is_premium,
          NOT u.status_bloqueado AND (coalesce(n.permite_publicar, false) OR EXISTS
            (SELECT 1 FROM plataforma.assinatura a WHERE a.id_usuario = u.id_usuario AND a.status = 'ativa'
             AND a.inicio <= CURRENT_TIMESTAMP AND a.fim > CURRENT_TIMESTAMP)) AS pode_publicar
        FROM plataforma.usuario u
        LEFT JOIN (SELECT id_usuario, sum(quantidade) AS saldo FROM plataforma.movimento_pontos GROUP BY id_usuario) p
          ON p.id_usuario = u.id_usuario
        LEFT JOIN LATERAL (SELECT * FROM plataforma.nivel WHERE pontos_minimos <= greatest(coalesce(p.saldo, 0), 0)
          ORDER BY pontos_minimos DESC LIMIT 1) n ON true;

        CREATE VIEW plataforma.v_catalogo_publico AS
        SELECT l.*, coalesce(a.nota_media, 0) AS nota_media, coalesce(a.quantidade, 0) AS total_avaliacoes,
          coalesce(c.acessos, 0) AS total_acessos
        FROM plataforma.livro l
        LEFT JOIN (SELECT id_livro, round(avg(nota), 2) nota_media, count(*) quantidade
          FROM plataforma.avaliacao WHERE NOT is_removida GROUP BY id_livro) a USING(id_livro)
        LEFT JOIN (SELECT id_livro, count(*) acessos FROM plataforma.acesso_livro GROUP BY id_livro) c USING(id_livro)
        WHERE l.status_publicacao = 'publicado' AND NOT l.status_bloqueado;

        CREATE VIEW plataforma.v_dashboard_leitura AS
        SELECT u.id_usuario,
          (SELECT count(*) FROM plataforma.progresso_leitura p WHERE p.id_usuario = u.id_usuario
            AND p.concluido_em IS NOT NULL) AS livros_concluidos,
          coalesce((SELECT sum(paginas_distintas_lidas) FROM plataforma.progresso_leitura p
            WHERE p.id_usuario = u.id_usuario), 0) AS paginas_lidas,
          coalesce((SELECT sum(tempo_ativo_segundos) FROM plataforma.sessao_leitura s
            WHERE s.id_usuario = u.id_usuario), 0) AS tempo_ativo_segundos,
          (SELECT count(DISTINCT lg.id_genero) FROM plataforma.progresso_leitura p
            JOIN plataforma.livro_genero lg USING(id_livro) WHERE p.id_usuario = u.id_usuario
              AND (p.paginas_distintas_lidas > 0 OR p.concluido_em IS NOT NULL)) AS generos_lidos,
          (SELECT count(DISTINCT la.id_autor) FROM plataforma.progresso_leitura p
            JOIN plataforma.livro_autor la USING(id_livro) WHERE p.id_usuario = u.id_usuario
              AND (p.paginas_distintas_lidas > 0 OR p.concluido_em IS NOT NULL)) AS autores_lidos
        FROM plataforma.usuario u;

        CREATE VIEW plataforma.v_admin_acessos_conteudo AS
        SELECT l.id_livro, l.titulo, count(a.id_acesso) AS acessos
        FROM plataforma.livro l LEFT JOIN plataforma.acesso_livro a USING(id_livro)
        GROUP BY l.id_livro, l.titulo;

        CREATE VIEW plataforma.v_admin_acessos_categoria AS
        SELECT g.id_genero, g.nome, count(a.id_acesso) AS acessos
        FROM plataforma.genero g LEFT JOIN plataforma.livro_genero lg USING(id_genero)
        LEFT JOIN plataforma.acesso_livro a ON a.id_livro = lg.id_livro GROUP BY g.id_genero, g.nome;

        CREATE VIEW plataforma.v_admin_quantidade_usuarios AS
        SELECT count(*) total_usuarios, count(*) FILTER(WHERE NOT status_bloqueado) usuarios_nao_bloqueados,
          count(*) FILTER(WHERE status_bloqueado) usuarios_bloqueados FROM plataforma.usuario;

        INSERT INTO plataforma.nivel(nome, pontos_minimos, permite_publicar) VALUES ('Leitor', 0, false);
        COMMENT ON TABLE plataforma.usuario IS 'senha_hash e gerado pelo backend; nunca armazenar senha em texto puro';
        COMMENT ON TABLE plataforma.progresso_leitura IS 'Unico por usuario/livro; backend valida paginas contra total_paginas';
        COMMENT ON TABLE plataforma.atividade_admin IS 'Backend grava acao e alteracao na mesma transacao; preservar logs';
        COMMENT ON TABLE plataforma.acesso_livro IS 'Cada linha e um evento de acesso; usuario NULL permite visitantes';
        COMMENT ON VIEW plataforma.v_admin_acessos_categoria IS 'Livro multigenero contribui para cada genero associado';
        """
    )


def downgrade() -> None:
    op.execute(sa.text(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE"))
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )
