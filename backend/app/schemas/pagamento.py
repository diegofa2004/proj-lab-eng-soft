from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.common import PositiveId, PublicSchema

StatusPagamento = Literal["pendente", "aprovado", "recusado", "estornado"]
Moeda = Annotated[str, Field(min_length=3, max_length=3)]


class PagamentoCreate(PublicSchema):
    id_assinatura: PositiveId
    valor: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    moeda: Moeda = "BRL"
    referencia_provedor: str | None = None


class PagamentoUpdate(PublicSchema):
    status: StatusPagamento | None = None
    referencia_provedor: str | None = None


class PagamentoPublic(PublicSchema):
    id_pagamento: int
    id_assinatura: int
    valor: Decimal
    moeda: str
    status: StatusPagamento
    data_hora: datetime
    referencia_provedor: str | None
