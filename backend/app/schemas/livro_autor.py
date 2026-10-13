from app.schemas.common import PositiveId, PublicSchema


class LivroAutorCreate(PublicSchema):
    id_livro: PositiveId
    id_autor: PositiveId


class LivroAutorPublic(PublicSchema):
    id_livro: int
    id_autor: int
