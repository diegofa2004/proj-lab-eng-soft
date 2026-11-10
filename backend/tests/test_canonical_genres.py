from app.canonical_genres import classify_subjects, normalize_subject
from app.models.regra_genero_canonico import RegraGeneroCanonico


def rule(rule_id: int, genre_id: int, pattern: str, weight: float = 0.85):
    return RegraGeneroCanonico(
        id_regra=rule_id,
        id_genero_canonico=genre_id,
        tipo="contains",
        padrao=pattern,
        peso=weight,
        prioridade=100,
        ativo=True,
    )


def test_normalization_is_case_and_accent_insensitive():
    assert normalize_subject("  Ficção   Científica ") == "ficcao cientifica"


def test_specific_pattern_shadows_generic_substring():
    matches = classify_subjects(
        ["Science fiction"],
        [rule(1, 1, "fiction", 0.2), rule(2, 2, "science"), rule(3, 3, "science fiction")],
    )

    assert [(match.genre_id, match.confidence) for match in matches] == [(3, 0.85)]


def test_low_weight_fallback_is_used_only_without_strong_match():
    rules = [rule(1, 1, "fiction", 0.2), rule(2, 2, "horror")]

    assert [match.genre_id for match in classify_subjects(["English fiction"], rules)] == [1]
    assert [match.genre_id for match in classify_subjects(["Horror tales; Fiction"], rules)] == [2]
