"""Indexes created by migration 0002, also registered for Alembic comparison."""

from sqlalchemy import Index, func, text

from app.models.acesso_livro import AcessoLivro
from app.models.asset_perfil import AssetPerfil
from app.models.assinatura import Assinatura
from app.models.atividade_admin import AtividadeAdmin
from app.models.autor import Autor
from app.models.avaliacao import Avaliacao
from app.models.item_lista import ItemLista
from app.models.livro import Livro
from app.models.livro_autor import LivroAutor
from app.models.livro_genero import LivroGenero
from app.models.movimento_pontos import MovimentoPontos
from app.models.nota_pessoal import NotaPessoal
from app.models.pagamento import Pagamento
from app.models.progresso_leitura import ProgressoLeitura
from app.models.sessao_leitura import SessaoLeitura

Index(
    "livro_titulo_busca", func.to_tsvector(text("'simple'"), Livro.titulo), postgresql_using="gin"
)
Index("autor_nome_busca", func.to_tsvector(text("'simple'"), Autor.nome), postgresql_using="gin")
Index("livro_data_publicacao", Livro.data_publicacao)
Index("livro_publicador", Livro.id_publicador)
Index("livro_autor_autor", LivroAutor.id_autor, LivroAutor.id_livro)
Index("livro_genero_genero", LivroGenero.id_genero, LivroGenero.id_livro)
Index("avaliacao_livro", Avaliacao.id_livro, postgresql_where=text("NOT is_removida"))
Index("item_lista_livro", ItemLista.id_livro)
Index("nota_usuario_livro", NotaPessoal.id_usuario, NotaPessoal.id_livro)
Index("nota_livro", NotaPessoal.id_livro)
Index("progresso_livro", ProgressoLeitura.id_livro)
Index("sessao_usuario_inicio", SessaoLeitura.id_usuario, SessaoLeitura.inicio.desc())
Index("sessao_livro", SessaoLeitura.id_livro)
Index("acesso_livro_data", AcessoLivro.id_livro, AcessoLivro.data_hora.desc())
Index("acesso_usuario", AcessoLivro.id_usuario)
Index("assinatura_plano", Assinatura.id_plano)
Index("pagamento_assinatura", Pagamento.id_assinatura)
Index("movimento_usuario_data", MovimentoPontos.id_usuario, MovimentoPontos.data_hora.desc())
Index("movimento_livro", MovimentoPontos.id_livro)
Index("log_admin_data", AtividadeAdmin.id_admin, AtividadeAdmin.data_hora.desc())
Index("log_usuario_alvo", AtividadeAdmin.id_usuario_alvo)
Index("log_livro_alvo", AtividadeAdmin.id_livro_alvo)
Index("log_avaliacao_alvo", AtividadeAdmin.id_avaliacao_alvo)
Index("asset_nivel", AssetPerfil.id_nivel_minimo)
