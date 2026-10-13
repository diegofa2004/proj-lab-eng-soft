from datetime import datetime

from app.schemas.common import PositiveId, PublicSchema


class AcessoLivroCreate(PublicSchema):
    id_livro: PositiveId


class AcessoLivroPublic(PublicSchema):
    id_acesso: int
    id_usuario: int | None
    id_livro: int
    data_hora: datetime
