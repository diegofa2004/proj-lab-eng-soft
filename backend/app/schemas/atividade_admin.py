from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.common import PositiveId, PublicSchema

TipoAcaoAdmin = Literal[
    "bloquear_usuario",
    "desbloquear_usuario",
    "bloquear_livro",
    "desbloquear_livro",
    "moderar_avaliacao",
    "editar_livro",
]


class AtividadeAdminCreate(PublicSchema):
    tipo_acao: TipoAcaoAdmin
    descricao: str = Field(min_length=1)
    id_usuario_alvo: PositiveId | None = None
    id_livro_alvo: PositiveId | None = None
    id_avaliacao_alvo: PositiveId | None = None

    @model_validator(mode="after")
    def validar_alvo(self) -> "AtividadeAdminCreate":
        targets = (self.id_usuario_alvo, self.id_livro_alvo, self.id_avaliacao_alvo)
        if sum(target is not None for target in targets) != 1:
            raise ValueError("exactly one target must be provided")
        if self.tipo_acao in {"bloquear_usuario", "desbloquear_usuario"}:
            valid = self.id_usuario_alvo is not None
        elif self.tipo_acao in {"bloquear_livro", "desbloquear_livro", "editar_livro"}:
            valid = self.id_livro_alvo is not None
        else:
            valid = self.id_avaliacao_alvo is not None
        if not valid:
            raise ValueError("target type does not match tipo_acao")
        return self


class AtividadeAdminPublic(PublicSchema):
    id_log: int
    id_admin: int
    id_usuario_alvo: int | None
    id_livro_alvo: int | None
    id_avaliacao_alvo: int | None
    tipo_acao: TipoAcaoAdmin
    descricao: str
    data_hora: datetime
