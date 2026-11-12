from pydantic import BaseModel, ConfigDict, Field


class GeneroCanonicoPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_genero_canonico: int
    slug: str
    nome: str
    descricao: str = ""
    ordem_exibicao: int = 0


class RegraGeneroCanonicoCreate(BaseModel):
    id_genero_canonico: int = Field(gt=0)
    tipo: str = Field(pattern="^(exact|contains|starts_with|ends_with)$")
    padrao: str = Field(min_length=1, max_length=200)
    peso: float = Field(default=0.85, gt=0, le=1)
    prioridade: int = 0


class RegraGeneroCanonicoPublic(RegraGeneroCanonicoCreate):
    model_config = ConfigDict(from_attributes=True)

    id_regra: int
    ativo: bool


class RegraGeneroCanonicoUpdate(BaseModel):
    tipo: str | None = Field(default=None, pattern="^(exact|contains|starts_with|ends_with)$")
    padrao: str | None = Field(default=None, min_length=1, max_length=200)
    peso: float | None = Field(default=None, gt=0, le=1)
    prioridade: int | None = None
    ativo: bool | None = None
