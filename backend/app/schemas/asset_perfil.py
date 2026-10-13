from typing import Literal

from pydantic import Field

from app.schemas.common import MediumName, PositiveId, PublicSchema

TipoAsset = Literal["avatar", "icone"]


class AssetPerfilCreate(PublicSchema):
    tipo: TipoAsset
    nome: MediumName
    arquivo: str = Field(min_length=1)
    exige_premium: bool = False
    id_nivel_minimo: PositiveId | None = None


class AssetPerfilUpdate(PublicSchema):
    nome: MediumName | None = None
    arquivo: str | None = Field(default=None, min_length=1)
    exige_premium: bool | None = None
    id_nivel_minimo: PositiveId | None = None


class AssetPerfilPublic(PublicSchema):
    id_asset: int
    tipo: TipoAsset
    nome: str
    arquivo: str
    exige_premium: bool
    id_nivel_minimo: int | None
