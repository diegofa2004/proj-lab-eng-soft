from app.api.endpoints.recommendations import _normalize, _rating_weight, _select_diverse


def test_rating_weight_values_clear_positive_and_negative_signals():
    assert _rating_weight(1) < 0
    assert _rating_weight(2) < 0
    assert _rating_weight(3) > 0
    assert _rating_weight(5) > _rating_weight(4) > _rating_weight(3)


def test_normalize_handles_empty_and_regular_ranges():
    assert _normalize(10, 20) == 0.5
    assert _normalize(10, 0) == 0


def test_diversity_limits_repeated_authors_before_filling_remaining_slots():
    ranked = [
        (1.0, 1, "reason", "genre"),
        (0.9, 2, "reason", "genre"),
        (0.8, 3, "reason", "genre"),
        (0.7, 4, "reason", "genre"),
    ]
    authors = {
        1: [(1, "Repeated")],
        2: [(1, "Repeated")],
        3: [(1, "Repeated")],
        4: [(2, "Different")],
    }
    genres = {book_id: [(book_id, f"Genre {book_id}")] for book_id in range(1, 5)}

    selected = _select_diverse(ranked, authors, genres, limit=3)

    assert [item[1] for item in selected] == [1, 2, 4]
