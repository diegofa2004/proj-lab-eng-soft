from app.db.session import Base
from app.models import indexes as _indexes  # noqa: F401 - register SQL indexes in metadata
from app.models.acesso_livro import AcessoLivro
from app.models.asset_perfil import AssetPerfil
from app.models.assinatura import Assinatura
from app.models.atividade_admin import AtividadeAdmin
from app.models.autor import Autor
from app.models.avaliacao import Avaliacao
from app.models.capa_livro import CapaLivro
from app.models.genero import Genero
from app.models.genero_canonico import GeneroCanonico
from app.models.item_lista import ItemLista
from app.models.livro import Livro
from app.models.livro_autor import LivroAutor
from app.models.livro_genero import LivroGenero
from app.models.livro_genero_canonico import LivroGeneroCanonico
from app.models.movimento_pontos import MovimentoPontos
from app.models.nivel import Nivel
from app.models.nota_pessoal import NotaPessoal
from app.models.pagamento import Pagamento
from app.models.plano import Plano
from app.models.preferencia_genero_usuario import PreferenciaGeneroUsuario
from app.models.progresso_leitura import ProgressoLeitura
from app.models.regra_genero_canonico import RegraGeneroCanonico
from app.models.sessao_leitura import SessaoLeitura
from app.models.user import User
from app.models.usuario_legado_pendente import UsuarioLegadoPendente

__all__ = [
    "AcessoLivro",
    "AssetPerfil",
    "Assinatura",
    "AtividadeAdmin",
    "Autor",
    "Avaliacao",
    "Base",
    "CapaLivro",
    "Genero",
    "GeneroCanonico",
    "ItemLista",
    "Livro",
    "LivroAutor",
    "LivroGenero",
    "LivroGeneroCanonico",
    "MovimentoPontos",
    "Nivel",
    "NotaPessoal",
    "Pagamento",
    "Plano",
    "PreferenciaGeneroUsuario",
    "ProgressoLeitura",
    "RegraGeneroCanonico",
    "SessaoLeitura",
    "User",
    "UsuarioLegadoPendente",
]
