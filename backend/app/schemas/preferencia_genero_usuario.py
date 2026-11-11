from pydantic import BaseModel, Field, model_validator


class PreferenciasGeneroUpdate(BaseModel):
    interesses: list[int] = Field(default_factory=list, max_length=20)
    nao_interessa: list[int] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def validate_lists(self):
        if any(item <= 0 for item in self.interesses + self.nao_interessa):
            raise ValueError("Genre IDs must be positive")
        if len(set(self.interesses)) != len(self.interesses):
            raise ValueError("Interest genres must be unique")
        if len(set(self.nao_interessa)) != len(self.nao_interessa):
            raise ValueError("Excluded genres must be unique")
        if set(self.interesses) & set(self.nao_interessa):
            raise ValueError("A genre cannot be both interested and excluded")
        return self


class PreferenciasGeneroPublic(BaseModel):
    concluido: bool
    interesses: list[int]
    nao_interessa: list[int]
