from app.schemas.common import AuthorName, PublicSchema


class AutorCreate(PublicSchema):
    nome: AuthorName


class AutorUpdate(PublicSchema):
    non_nullable_fields = frozenset({"nome"})
    nome: AuthorName | None = None


class AutorPublic(PublicSchema):
    id_autor: int
    nome: str
