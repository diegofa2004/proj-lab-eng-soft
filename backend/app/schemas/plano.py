from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field

from app.schemas.common import MediumName, PublicSchema

Periodicidade = Literal["mensal", "anual"]
Moeda = Annotated[str, Field(min_length=3, max_length=3)]


class PlanoCreate(PublicSchema):
    nome: MediumName
    preco: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    moeda: Moeda = "BRL"
    periodicidade: Periodicidade
    ativo: bool = True


class PlanoUpdate(PublicSchema):
    nome: MediumName | None = None
    preco: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    moeda: Moeda | None = None
    periodicidade: Periodicidade | None = None
    ativo: bool | None = None


class PlanoPublic(PublicSchema):
    id_plano: int
    nome: str
    preco: Decimal
    moeda: str
    periodicidade: Periodicidade
    ativo: bool
