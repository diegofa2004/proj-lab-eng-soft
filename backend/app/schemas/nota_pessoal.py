from datetime import datetime

from pydantic import Field

from app.schemas.common import PositiveId, PublicSchema


class NotaPessoalCreate(PublicSchema):
    id_livro: PositiveId
    texto: str = Field(min_length=1)
    localizacao: str | None = None


class NotaPessoalUpdate(PublicSchema):
    texto: str | None = Field(default=None, min_length=1)
    localizacao: str | None = None


class NotaPessoalPublic(PublicSchema):
    id_nota: int
    id_usuario: int
    id_livro: int
    texto: str
    localizacao: str | None
    data_criacao: datetime
    data_atualizacao: datetime
