"""Required database columns must reject explicit null in PATCH requests."""

import pytest
from pydantic import ValidationError

from app.schemas.asset_perfil import AssetPerfilUpdate
from app.schemas.autor import AutorUpdate
from app.schemas.genero import GeneroUpdate
from app.schemas.livro import LivroUpdate
from app.schemas.nivel import NivelUpdate
from app.schemas.nota_pessoal import NotaPessoalUpdate
from app.schemas.plano import PlanoUpdate
from app.schemas.progresso_leitura import ProgressoLeituraUpdate


@pytest.mark.parametrize(
    ("schema", "field"),
    [
        (NotaPessoalUpdate, "texto"),
        (LivroUpdate, "titulo"),
        (LivroUpdate, "descricao"),
        (LivroUpdate, "total_paginas"),
        (AutorUpdate, "nome"),
        (GeneroUpdate, "nome"),
        (NivelUpdate, "pontos_minimos"),
        (NivelUpdate, "permite_publicar"),
        (PlanoUpdate, "preco"),
        (PlanoUpdate, "ativo"),
        (AssetPerfilUpdate, "arquivo"),
        (AssetPerfilUpdate, "exige_premium"),
        (ProgressoLeituraUpdate, "paginas_distintas_lidas"),
    ],
)
def test_explicit_null_is_rejected(schema, field):
    with pytest.raises(ValidationError):
        schema.model_validate({field: None})


def test_nullable_columns_still_accept_null():
    assert NotaPessoalUpdate.model_validate({"localizacao": None}).localizacao is None
    assert AssetPerfilUpdate.model_validate({"id_nivel_minimo": None}).id_nivel_minimo is None
