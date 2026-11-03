# ruff: noqa: E501
"""create book distribution platform

Revision ID: 20261013_0002
Revises: 20260921_0001
Create Date: 2026-10-13 00:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261013_0002"
down_revision: str | Sequence[str] | None = "20260921_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "plataforma"


def upgrade() -> None:
    op.execute(sa.schema.CreateSchema(SCHEMA))
    op.execute("""
CREATE TABLE plataforma.nivel (
	id_nivel BIGINT GENERATED ALWAYS AS IDENTITY,
	nome VARCHAR(80) NOT NULL,
	pontos_minimos BIGINT NOT NULL,
	permite_publicar BOOLEAN DEFAULT false NOT NULL,
	PRIMARY KEY (id_nivel),
	CONSTRAINT ck_nivel_pontos_minimos CHECK (pontos_minimos >= 0),
	UNIQUE (nome),
	UNIQUE (pontos_minimos)
);
CREATE TABLE plataforma.asset_perfil (
	id_asset BIGINT GENERATED ALWAYS AS IDENTITY,
	tipo VARCHAR(10) NOT NULL,
	nome VARCHAR(100) NOT NULL,
	arquivo TEXT NOT NULL,
	exige_premium BOOLEAN DEFAULT false NOT NULL,
	id_nivel_minimo BIGINT,
	PRIMARY KEY (id_asset),
	CONSTRAINT ck_asset_perfil_tipo CHECK (tipo IN ('avatar', 'icone')),
	UNIQUE (tipo, nome),
	FOREIGN KEY(id_nivel_minimo) REFERENCES plataforma.nivel (id_nivel) ON DELETE RESTRICT
);
CREATE TABLE plataforma.usuario (
	id_usuario BIGINT GENERATED ALWAYS AS IDENTITY,
	nome_perfil VARCHAR(100) NOT NULL,
	email VARCHAR(254) NOT NULL,
	senha_hash TEXT NOT NULL,
	biografia TEXT DEFAULT '' NOT NULL,
	is_admin BOOLEAN DEFAULT false NOT NULL,
	status_bloqueado BOOLEAN DEFAULT false NOT NULL,
	ultima_atividade TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	id_avatar BIGINT,
	id_icone BIGINT,
	PRIMARY KEY (id_usuario),
	CONSTRAINT ck_usuario_nome_perfil CHECK (trim(nome_perfil) <> ''),
	CONSTRAINT ck_usuario_email_normalizado CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1),
	CONSTRAINT ck_usuario_senha_hash CHECK (trim(senha_hash) <> ''),
	UNIQUE (email),
	UNIQUE (nome_perfil),
	FOREIGN KEY(id_avatar) REFERENCES plataforma.asset_perfil (id_asset) ON DELETE RESTRICT,
	FOREIGN KEY(id_icone) REFERENCES plataforma.asset_perfil (id_asset) ON DELETE RESTRICT
);
CREATE TABLE plataforma.autor (
	id_autor BIGINT GENERATED ALWAYS AS IDENTITY,
	nome VARCHAR(200) NOT NULL,
	PRIMARY KEY (id_autor),
	CONSTRAINT ck_autor_nome CHECK (btrim(nome) <> '')
);
CREATE TABLE plataforma.genero (
	id_genero BIGINT GENERATED ALWAYS AS IDENTITY,
	nome VARCHAR(100) NOT NULL,
	PRIMARY KEY (id_genero),
	CONSTRAINT ck_genero_nome CHECK (btrim(nome) <> '')
);
CREATE UNIQUE INDEX genero_nome_ci ON plataforma.genero (lower(nome));
CREATE TABLE plataforma.livro (
	id_livro BIGINT GENERATED ALWAYS AS IDENTITY,
	titulo VARCHAR(300) NOT NULL,
	descricao TEXT DEFAULT '' NOT NULL,
	data_publicacao DATE NOT NULL,
	arquivo_conteudo TEXT NOT NULL,
	total_paginas INTEGER NOT NULL,
	origem VARCHAR(10) NOT NULL,
	status_publicacao VARCHAR(15) DEFAULT 'rascunho' NOT NULL,
	status_bloqueado BOOLEAN DEFAULT false NOT NULL,
	id_publicador BIGINT,
	criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY (id_livro),
	CONSTRAINT ck_livro_titulo CHECK (btrim(titulo) <> ''),
	CONSTRAINT ck_livro_total_paginas CHECK (total_paginas > 0),
	CONSTRAINT ck_livro_origem CHECK (origem IN ('catalogo', 'usuario')),
	CONSTRAINT ck_livro_status_publicacao CHECK (status_publicacao IN ('rascunho', 'publicado', 'arquivado')),
	CONSTRAINT ck_livro_publicador CHECK (origem <> 'usuario' OR id_publicador IS NOT NULL),
	FOREIGN KEY(id_publicador) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT
);
CREATE TABLE plataforma.livro_autor (
	id_livro BIGINT NOT NULL,
	id_autor BIGINT NOT NULL,
	PRIMARY KEY (id_livro, id_autor),
	FOREIGN KEY(id_livro) REFERENCES plataforma.livro (id_livro) ON DELETE CASCADE,
	FOREIGN KEY(id_autor) REFERENCES plataforma.autor (id_autor) ON DELETE RESTRICT
);
CREATE TABLE plataforma.livro_genero (
	id_livro BIGINT NOT NULL,
	id_genero BIGINT NOT NULL,
	PRIMARY KEY (id_livro, id_genero),
	FOREIGN KEY(id_livro) REFERENCES plataforma.livro (id_livro) ON DELETE CASCADE,
	FOREIGN KEY(id_genero) REFERENCES plataforma.genero (id_genero) ON DELETE RESTRICT
);
CREATE TABLE plataforma.avaliacao (
	id_avaliacao BIGINT GENERATED ALWAYS AS IDENTITY,
	id_usuario BIGINT NOT NULL,
	id_livro BIGINT NOT NULL,
	nota SMALLINT NOT NULL,
	texto_revisao TEXT,
	data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	is_removida BOOLEAN DEFAULT false NOT NULL,
	PRIMARY KEY (id_avaliacao),
	CONSTRAINT ck_avaliacao_nota CHECK (nota BETWEEN 1 AND 5),
	CONSTRAINT ck_avaliacao_texto_revisao CHECK (texto_revisao IS NULL OR btrim(texto_revisao) <> ''),
	UNIQUE (id_usuario, id_livro),
	FOREIGN KEY(id_usuario) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_livro) REFERENCES plataforma.livro (id_livro) ON DELETE RESTRICT
);
CREATE TABLE plataforma.item_lista (
	id_item BIGINT GENERATED ALWAYS AS IDENTITY,
	id_usuario BIGINT NOT NULL,
	id_livro BIGINT NOT NULL,
	tipo VARCHAR(12) NOT NULL,
	data_adicao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY (id_item),
	CONSTRAINT ck_item_lista_tipo CHECK (tipo IN ('favorito', 'ler_depois')),
	UNIQUE (id_usuario, id_livro, tipo),
	FOREIGN KEY(id_usuario) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_livro) REFERENCES plataforma.livro (id_livro) ON DELETE RESTRICT
);
CREATE TABLE plataforma.nota_pessoal (
	id_nota BIGINT GENERATED ALWAYS AS IDENTITY,
	id_usuario BIGINT NOT NULL,
	id_livro BIGINT NOT NULL,
	texto TEXT NOT NULL,
	localizacao TEXT,
	data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY (id_nota),
	CONSTRAINT ck_nota_pessoal_texto CHECK (btrim(texto) <> ''),
	FOREIGN KEY(id_usuario) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_livro) REFERENCES plataforma.livro (id_livro) ON DELETE RESTRICT
);
CREATE TABLE plataforma.progresso_leitura (
	id_progresso BIGINT GENERATED ALWAYS AS IDENTITY,
	id_usuario BIGINT NOT NULL,
	id_livro BIGINT NOT NULL,
	ultima_posicao TEXT,
	paginas_distintas_lidas INTEGER DEFAULT 0 NOT NULL,
	concluido_em TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (id_progresso),
	CONSTRAINT ck_progresso_paginas CHECK (paginas_distintas_lidas >= 0),
	UNIQUE (id_usuario, id_livro),
	FOREIGN KEY(id_usuario) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_livro) REFERENCES plataforma.livro (id_livro) ON DELETE RESTRICT
);
CREATE TABLE plataforma.sessao_leitura (
	id_sessao BIGINT GENERATED ALWAYS AS IDENTITY,
	id_usuario BIGINT NOT NULL,
	id_livro BIGINT NOT NULL,
	inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	fim TIMESTAMP WITH TIME ZONE,
	tempo_ativo_segundos BIGINT DEFAULT 0 NOT NULL,
	PRIMARY KEY (id_sessao),
	CONSTRAINT ck_sessao_tempo_ativo CHECK (tempo_ativo_segundos >= 0),
	CONSTRAINT ck_sessao_periodo CHECK (fim IS NULL OR fim >= inicio),
	FOREIGN KEY(id_usuario) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_livro) REFERENCES plataforma.livro (id_livro) ON DELETE RESTRICT
);
CREATE TABLE plataforma.acesso_livro (
	id_acesso BIGINT GENERATED ALWAYS AS IDENTITY,
	id_usuario BIGINT,
	id_livro BIGINT NOT NULL,
	data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY (id_acesso),
	FOREIGN KEY(id_usuario) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_livro) REFERENCES plataforma.livro (id_livro) ON DELETE RESTRICT
);
CREATE TABLE plataforma.plano (
	id_plano BIGINT GENERATED ALWAYS AS IDENTITY,
	nome VARCHAR(100) NOT NULL,
	preco NUMERIC(12, 2) NOT NULL,
	moeda VARCHAR(3) DEFAULT 'BRL' NOT NULL,
	periodicidade VARCHAR(10) NOT NULL,
	ativo BOOLEAN DEFAULT true NOT NULL,
	PRIMARY KEY (id_plano),
	CONSTRAINT ck_plano_preco CHECK (preco >= 0),
	CONSTRAINT ck_plano_periodicidade CHECK (periodicidade IN ('mensal', 'anual')),
	UNIQUE (nome)
);
CREATE TABLE plataforma.assinatura (
	id_assinatura BIGINT GENERATED ALWAYS AS IDENTITY,
	id_usuario BIGINT NOT NULL,
	id_plano BIGINT NOT NULL,
	status VARCHAR(12) DEFAULT 'pendente' NOT NULL,
	inicio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	fim TIMESTAMP WITH TIME ZONE,
	referencia_provedor TEXT,
	PRIMARY KEY (id_assinatura),
	CONSTRAINT ck_assinatura_status CHECK (status IN ('pendente', 'ativa', 'cancelada', 'expirada')),
	CONSTRAINT ck_assinatura_periodo CHECK (fim IS NULL OR fim > inicio),
	CONSTRAINT ck_assinatura_ativa_fim CHECK (status <> 'ativa' OR fim IS NOT NULL),
	UNIQUE (referencia_provedor),
	FOREIGN KEY(id_usuario) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_plano) REFERENCES plataforma.plano (id_plano) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX assinatura_ativa_usuario ON plataforma.assinatura (id_usuario) WHERE status = 'ativa';
CREATE TABLE plataforma.pagamento (
	id_pagamento BIGINT GENERATED ALWAYS AS IDENTITY,
	id_assinatura BIGINT NOT NULL,
	valor NUMERIC(12, 2) NOT NULL,
	moeda VARCHAR(3) DEFAULT 'BRL' NOT NULL,
	status VARCHAR(12) DEFAULT 'pendente' NOT NULL,
	data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	referencia_provedor TEXT,
	PRIMARY KEY (id_pagamento),
	CONSTRAINT ck_pagamento_valor CHECK (valor >= 0),
	CONSTRAINT ck_pagamento_status CHECK (status IN ('pendente', 'aprovado', 'recusado', 'estornado')),
	UNIQUE (referencia_provedor),
	FOREIGN KEY(id_assinatura) REFERENCES plataforma.assinatura (id_assinatura) ON DELETE RESTRICT
);
CREATE TABLE plataforma.movimento_pontos (
	id_movimento BIGINT GENERATED ALWAYS AS IDENTITY,
	id_usuario BIGINT NOT NULL,
	id_livro BIGINT,
	quantidade BIGINT NOT NULL,
	motivo VARCHAR(15) NOT NULL,
	data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	data_referencia DATE,
	chave_evento TEXT NOT NULL,
	PRIMARY KEY (id_movimento),
	CONSTRAINT ck_movimento_quantidade CHECK (quantidade <> 0),
	CONSTRAINT ck_movimento_motivo CHECK (motivo IN ('leitura', 'inatividade', 'ajuste')),
	CONSTRAINT ck_movimento_leitura CHECK (motivo <> 'leitura' OR (id_livro IS NOT NULL AND quantidade > 0)),
	CONSTRAINT ck_movimento_inatividade CHECK (motivo <> 'inatividade' OR (id_livro IS NULL AND quantidade < 0 AND data_referencia IS NOT NULL)),
	UNIQUE (chave_evento),
	FOREIGN KEY(id_usuario) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_livro) REFERENCES plataforma.livro (id_livro) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX pontos_deducao_diaria ON plataforma.movimento_pontos (id_usuario, data_referencia) WHERE motivo = 'inatividade';
CREATE UNIQUE INDEX pontos_recompensa_unica ON plataforma.movimento_pontos (id_usuario, id_livro) WHERE motivo = 'leitura';
CREATE TABLE plataforma.atividade_admin (
	id_log BIGINT GENERATED ALWAYS AS IDENTITY,
	id_admin BIGINT NOT NULL,
	id_usuario_alvo BIGINT,
	id_livro_alvo BIGINT,
	id_avaliacao_alvo BIGINT,
	tipo_acao VARCHAR(30) NOT NULL,
	descricao TEXT NOT NULL,
	data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY (id_log),
	CONSTRAINT ck_atividade_admin_tipo CHECK (tipo_acao IN ('bloquear_usuario', 'desbloquear_usuario', 'bloquear_livro', 'desbloquear_livro', 'moderar_avaliacao', 'editar_livro')),
	CONSTRAINT ck_atividade_admin_um_alvo CHECK (num_nonnulls(id_usuario_alvo, id_livro_alvo, id_avaliacao_alvo) = 1),
	CONSTRAINT ck_atividade_admin_alvo_tipo CHECK ((tipo_acao IN ('bloquear_usuario', 'desbloquear_usuario') AND id_usuario_alvo IS NOT NULL) OR (tipo_acao IN ('bloquear_livro', 'desbloquear_livro', 'editar_livro') AND id_livro_alvo IS NOT NULL) OR (tipo_acao = 'moderar_avaliacao' AND id_avaliacao_alvo IS NOT NULL)),
	FOREIGN KEY(id_admin) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_usuario_alvo) REFERENCES plataforma.usuario (id_usuario) ON DELETE RESTRICT,
	FOREIGN KEY(id_livro_alvo) REFERENCES plataforma.livro (id_livro) ON DELETE RESTRICT,
	FOREIGN KEY(id_avaliacao_alvo) REFERENCES plataforma.avaliacao (id_avaliacao) ON DELETE RESTRICT
)
""")
    op.execute("""
        CREATE TABLE plataforma.usuario_legado_pendente (
            id_legado INTEGER PRIMARY KEY,
            nome_perfil VARCHAR(50) NOT NULL,
            email VARCHAR(320) NOT NULL,
            senha_hash VARCHAR(255) NOT NULL
        );
        INSERT INTO plataforma.usuario_legado_pendente(id_legado, nome_perfil, email, senha_hash)
        SELECT id, username, email, password_hash FROM public.users;
        WITH candidates AS (
            SELECT *, row_number() OVER (PARTITION BY lower(btrim(email)) ORDER BY id_legado) AS rank
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
    """)
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
    raise RuntimeError("Irreversible platform migration. Restore a PostgreSQL backup to roll back.")
