from datetime import datetime
from typing import Literal

from pydantic import model_validator

from app.schemas.common import PositiveId, PublicSchema

StatusAssinatura = Literal["pendente", "ativa", "cancelada", "expirada"]


class AssinaturaCreate(PublicSchema):
    id_plano: PositiveId
    inicio: datetime | None = None
    fim: datetime | None = None
    referencia_provedor: str | None = None

    @model_validator(mode="after")
    def validar_periodo(self) -> "AssinaturaCreate":
        if self.inicio is not None and self.fim is not None and self.fim <= self.inicio:
            raise ValueError("fim must be later than inicio")
        return self


class AssinaturaUpdate(PublicSchema):
    status: StatusAssinatura | None = None
    fim: datetime | None = None
    referencia_provedor: str | None = None


class AssinaturaPublic(PublicSchema):
    id_assinatura: int
    id_usuario: int
    id_plano: int
    status: StatusAssinatura
    inicio: datetime
    fim: datetime | None
    referencia_provedor: str | None
