from app.schemas.common import MediumName, PublicSchema


class GeneroCreate(PublicSchema):
    nome: MediumName


class GeneroUpdate(PublicSchema):
    nome: MediumName | None = None


class GeneroPublic(PublicSchema):
    id_genero: int
    nome: str
