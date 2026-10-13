from datetime import datetime
from typing import Literal

from app.schemas.common import PositiveId, PublicSchema

TipoItemLista = Literal["favorito", "ler_depois"]


class ItemListaCreate(PublicSchema):
    id_livro: PositiveId
    tipo: TipoItemLista


class ItemListaPublic(PublicSchema):
    id_item: int
    id_usuario: int
    id_livro: int
    tipo: TipoItemLista
    data_adicao: datetime
