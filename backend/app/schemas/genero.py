from app.schemas.common import MediumName, PublicSchema


class GeneroCreate(PublicSchema):
    nome: MediumName


class GeneroUpdate(PublicSchema):
    non_nullable_fields = frozenset({"nome"})
    nome: MediumName | None = None


class GeneroPublic(PublicSchema):
    id_genero: int
    nome: str
