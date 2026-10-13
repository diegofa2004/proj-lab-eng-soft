from datetime import datetime

from pydantic import Field, model_validator

from app.schemas.common import PositiveId, PublicSchema


class SessaoLeituraCreate(PublicSchema):
    id_livro: PositiveId
    inicio: datetime | None = None
    fim: datetime | None = None
    tempo_ativo_segundos: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validar_intervalo(self) -> "SessaoLeituraCreate":
        if self.inicio is not None and self.fim is not None and self.fim < self.inicio:
            raise ValueError("fim must not be earlier than inicio")
        return self


class SessaoLeituraUpdate(PublicSchema):
    fim: datetime | None = None
    tempo_ativo_segundos: int | None = Field(default=None, ge=0)


class SessaoLeituraPublic(PublicSchema):
    id_sessao: int
    id_usuario: int
    id_livro: int
    inicio: datetime
    fim: datetime | None
    tempo_ativo_segundos: int
