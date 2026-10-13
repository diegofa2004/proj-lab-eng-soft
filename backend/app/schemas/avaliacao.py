from datetime import datetime

from pydantic import Field

from app.schemas.common import PositiveId, PublicSchema


class AvaliacaoCreate(PublicSchema):
    id_livro: PositiveId
    nota: int = Field(ge=1, le=5)
    texto_revisao: str | None = Field(default=None, min_length=1)


class AvaliacaoUpdate(PublicSchema):
    nota: int | None = Field(default=None, ge=1, le=5)
    texto_revisao: str | None = Field(default=None, min_length=1)


class AvaliacaoPublic(PublicSchema):
    id_avaliacao: int
    id_usuario: int
    id_livro: int
    nota: int
    texto_revisao: str | None
    data_hora: datetime
    is_removida: bool
