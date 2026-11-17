from decimal import Decimal
from typing import Annotated, Literal

from pydantic import Field, model_validator

from app.schemas.common import MediumName, PublicSchema

Periodicidade = Literal["mensal", "anual"]
PlanTier = Literal["individual", "family_and_friends"]
Moeda = Annotated[str, Field(min_length=3, max_length=3)]


class PlanoCreate(PublicSchema):
    nome: MediumName
    preco: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    moeda: Moeda = "BRL"
    periodicidade: Periodicidade
    ativo: bool = True
    tier: PlanTier = "individual"
    max_members: int = Field(default=1, ge=1, le=4)
    requires_adult_holder: bool = False

    @model_validator(mode="after")
    def validate_family_configuration(self) -> "PlanoCreate":
        if self.tier == "individual" and (
            self.max_members != 1 or self.requires_adult_holder
        ):
            raise ValueError("Individual plans must cover exactly one reader")
        if self.tier == "family_and_friends" and (
            not 2 <= self.max_members <= 4 or not self.requires_adult_holder
        ):
            raise ValueError("Family plans require an adult holder and must cover 2 to 4 readers")
        return self


class PlanoUpdate(PublicSchema):
    non_nullable_fields = frozenset(
        {
            "nome",
            "preco",
            "moeda",
            "periodicidade",
            "ativo",
            "tier",
            "max_members",
            "requires_adult_holder",
        }
    )
    nome: MediumName | None = None
    preco: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    moeda: Moeda | None = None
    periodicidade: Periodicidade | None = None
    ativo: bool | None = None
    tier: PlanTier | None = None
    max_members: int | None = Field(default=None, ge=1, le=4)
    requires_adult_holder: bool | None = None


class PlanoPublic(PublicSchema):
    id_plano: int
    nome: str
    preco: Decimal
    moeda: str
    periodicidade: Periodicidade
    ativo: bool
    tier: PlanTier
    max_members: int
    requires_adult_holder: bool
