from datetime import datetime

from app.schemas.common import NonEmptyText, PositiveId, PublicSchema


class NotaPessoalCreate(PublicSchema):
    id_livro: PositiveId
    texto: NonEmptyText
    localizacao: str | None = None


class NotaPessoalUpdate(PublicSchema):
    non_nullable_fields = frozenset({"texto"})
    texto: NonEmptyText | None = None
    localizacao: str | None = None


class NotaPessoalPublic(PublicSchema):
    id_nota: int
    id_usuario: int
    id_livro: int
    texto: str
    localizacao: str | None
    data_criacao: datetime
    data_atualizacao: datetime
