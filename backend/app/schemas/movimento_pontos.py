# ruff: noqa: E501
from datetime import date, datetime
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import PositiveId, PublicSchema

MotivoMovimento = Literal["leitura", "inatividade", "ajuste"]


class MovimentoPontosCreate(PublicSchema):
    id_livro: PositiveId | None = None
    quantidade: int
    motivo: MotivoMovimento
    data_referencia: date | None = None
    chave_evento: str = Field(min_length=1)

    @model_validator(mode="after")
    def validar_motivo(self) -> "MovimentoPontosCreate":
        if self.quantidade == 0:
            raise ValueError("quantidade must not be zero")
        if self.motivo == "leitura" and (self.id_livro is None or self.quantidade <= 0):
            raise ValueError("leitura requires id_livro and a positive quantidade")
        if self.motivo == "inatividade" and (
            self.id_livro is not None or self.quantidade >= 0 or self.data_referencia is None
        ):
            raise ValueError(
                "inatividade requires no id_livro, a negative quantidade and data_referencia"
            )
        return self


class MovimentoPontosPublic(PublicSchema):
    id_movimento: int
    id_usuario: int
    id_livro: int | None
    quantidade: int
    motivo: MotivoMovimento
    data_hora: datetime
    data_referencia: date | None
    chave_evento: str
