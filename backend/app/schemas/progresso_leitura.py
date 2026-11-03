from datetime import datetime

from pydantic import Field

from app.schemas.common import PositiveId, PublicSchema


class ProgressoLeituraCreate(PublicSchema):
    id_livro: PositiveId
    ultima_posicao: str | None = None
    paginas_distintas_lidas: int = Field(default=0, ge=0)
    concluido_em: datetime | None = None


class ProgressoLeituraUpdate(PublicSchema):
    non_nullable_fields = frozenset({"paginas_distintas_lidas"})
    ultima_posicao: str | None = None
    paginas_distintas_lidas: int | None = Field(default=None, ge=0)
    concluido_em: datetime | None = None


class ProgressoLeituraPublic(PublicSchema):
    id_progresso: int
    id_usuario: int
    id_livro: int
    ultima_posicao: str | None
    paginas_distintas_lidas: int
    concluido_em: datetime | None
