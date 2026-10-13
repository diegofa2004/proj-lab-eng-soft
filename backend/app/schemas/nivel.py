from pydantic import Field

from app.schemas.common import PublicSchema, ShortName


class NivelCreate(PublicSchema):
    nome: ShortName
    pontos_minimos: int = Field(ge=0)
    permite_publicar: bool = False


class NivelUpdate(PublicSchema):
    nome: ShortName | None = None
    pontos_minimos: int | None = Field(default=None, ge=0)
    permite_publicar: bool | None = None


class NivelPublic(PublicSchema):
    id_nivel: int
    nome: str
    pontos_minimos: int
    permite_publicar: bool
