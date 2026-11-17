from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import BookTitle, PublicSchema

MAX_CAPITULO_CHARS = 1024 * 1024


class CapituloCreate(PublicSchema):
    titulo: BookTitle
    conteudo: str = ""

    @field_validator("conteudo")
    @classmethod
    def validate_conteudo(cls, value: str) -> str:
        if len(value) > MAX_CAPITULO_CHARS:
            raise ValueError("Chapter content must be at most 1 MiB")
        return value


class CapituloUpdate(PublicSchema):
    non_nullable_fields = frozenset({"titulo", "conteudo", "versao"})
    titulo: BookTitle | None = None
    conteudo: str | None = None
    versao: int = Field(gt=0)

    @field_validator("conteudo")
    @classmethod
    def validate_conteudo(cls, value: str | None) -> str | None:
        if value is not None and len(value) > MAX_CAPITULO_CHARS:
            raise ValueError("Chapter content must be at most 1 MiB")
        return value


class CapituloPublic(PublicSchema):
    id_capitulo: int
    id_livro: int
    ordem: int
    titulo: str
    conteudo: str
    versao: int
    criado_em: datetime
    atualizado_em: datetime


class CapituloReorder(PublicSchema):
    capitulos: list[int] = Field(min_length=1)

    @field_validator("capitulos")
    @classmethod
    def validate_unique_ids(cls, value: list[int]) -> list[int]:
        if len(set(value)) != len(value):
            raise ValueError("Chapter ids must be unique")
        return value
