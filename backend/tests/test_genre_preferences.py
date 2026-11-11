import pytest
from pydantic import ValidationError

from app.schemas.preferencia_genero_usuario import PreferenciasGeneroUpdate


def test_genre_preference_lists_accept_distinct_positive_ids():
    preferences = PreferenciasGeneroUpdate(interesses=[1, 7], nao_interessa=[5])

    assert preferences.interesses == [1, 7]
    assert preferences.nao_interessa == [5]


@pytest.mark.parametrize(
    ("interests", "excluded"),
    [([1, 1], []), ([], [2, 2]), ([3], [3]), ([0], [])],
)
def test_genre_preference_lists_reject_invalid_or_conflicting_ids(interests, excluded):
    with pytest.raises(ValidationError):
        PreferenciasGeneroUpdate(interesses=interests, nao_interessa=excluded)
