from app.schemas.common import PositiveId, PublicSchema


class LivroGeneroCreate(PublicSchema):
    id_livro: PositiveId
    id_genero: PositiveId


class LivroGeneroPublic(PublicSchema):
    id_livro: int
    id_genero: int
