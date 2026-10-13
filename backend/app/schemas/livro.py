from datetime import date, datetime
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import BookTitle, PositiveId, PublicSchema

OrigemLivro = Literal["catalogo", "usuario"]
StatusPublicacao = Literal["rascunho", "publicado", "arquivado"]


class LivroCreate(PublicSchema):
    titulo: BookTitle
    descricao: str = ""
    data_publicacao: date
    arquivo_conteudo: str = Field(min_length=1)
    total_paginas: int = Field(gt=0)
    origem: OrigemLivro
    id_publicador: PositiveId | None = None

    @model_validator(mode="after")
    def exigir_publicador_de_usuario(self) -> "LivroCreate":
        if self.origem == "usuario" and self.id_publicador is None:
            raise ValueError("id_publicador is required when origem is usuario")
        return self


class LivroUpdate(PublicSchema):
    titulo: BookTitle | None = None
    descricao: str | None = None
    data_publicacao: date | None = None
    arquivo_conteudo: str | None = Field(default=None, min_length=1)
    total_paginas: int | None = Field(default=None, gt=0)
    status_publicacao: StatusPublicacao | None = None
    status_bloqueado: bool | None = None


class LivroPublic(PublicSchema):
    id_livro: int
    titulo: str
    descricao: str
    data_publicacao: date
    arquivo_conteudo: str
    total_paginas: int
    origem: OrigemLivro
    status_publicacao: StatusPublicacao
    status_bloqueado: bool
    id_publicador: int | None
    criado_em: datetime
