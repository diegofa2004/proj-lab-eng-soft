from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta
from math import log1p
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import func, select

from app.api.books import CatalogBookPublic, catalog_books
from app.api.platform import DB, Reader
from app.db.base import (
    AcessoLivro,
    Autor,
    Avaliacao,
    GeneroCanonico,
    ItemLista,
    Livro,
    LivroAutor,
    LivroGeneroCanonico,
    PreferenciaGeneroUsuario,
    ProgressoLeitura,
    SessaoLeitura,
)

router = APIRouter(tags=["Recommendations"])


class FeedBook(CatalogBookPublic):
    nota_media: float = 0
    total_avaliacoes: int = 0
    total_acessos: int = 0


class RecommendationPublic(BaseModel):
    book: FeedBook
    reason: str
    reason_type: Literal["genre", "author", "trending", "rating", "discovery"]


def _normalize(value: float, maximum: float) -> float:
    return value / maximum if maximum > 0 else 0


def _rating_weight(rating: int) -> float:
    return {1: -4, 2: -2, 3: 0.5, 4: 3, 5: 5}[rating]


def _select_diverse(
    ranked: list[tuple[float, int, str, str]],
    authors_by_book: dict[int, list[tuple[int, str]]],
    genres_by_book: dict[int, list[tuple[int, str]]],
    limit: int,
) -> list[tuple[float, int, str, str]]:
    """Keep recommendations useful without filling a shelf with one author or genre."""
    selected: list[tuple[float, int, str, str]] = []
    selected_ids: set[int] = set()
    author_counts: Counter[int] = Counter()
    genre_counts: Counter[int] = Counter()

    for item in ranked:
        book_id = item[1]
        author_ids = [author_id for author_id, _ in authors_by_book[book_id]]
        genre_ids = [genre_id for genre_id, _ in genres_by_book[book_id]]
        if any(author_counts[author_id] >= 2 for author_id in author_ids):
            continue
        if genre_ids and all(genre_counts[genre_id] >= 3 for genre_id in genre_ids):
            continue
        selected.append(item)
        selected_ids.add(book_id)
        author_counts.update(author_ids)
        genre_counts.update(genre_ids)
        if len(selected) == limit:
            return selected

    for item in ranked:
        if item[1] not in selected_ids:
            selected.append(item)
            if len(selected) == limit:
                break
    return selected


def _book_context(db: DB, books: list[Livro]):
    ids = [book.id_livro for book in books]
    authors_by_book: dict[int, list[tuple[int, str]]] = defaultdict(list)
    genres_by_book: dict[int, list[tuple[int, str]]] = defaultdict(list)
    if ids:
        for book_id, author_id, name in db.execute(
            select(LivroAutor.id_livro, Autor.id_autor, Autor.nome)
            .join(Autor, Autor.id_autor == LivroAutor.id_autor)
            .where(LivroAutor.id_livro.in_(ids))
        ):
            authors_by_book[book_id].append((author_id, name))
        for book_id, genre_id, name in db.execute(
            select(
                LivroGeneroCanonico.id_livro,
                GeneroCanonico.id_genero_canonico,
                GeneroCanonico.nome,
            )
            .join(
                GeneroCanonico,
                GeneroCanonico.id_genero_canonico == LivroGeneroCanonico.id_genero_canonico,
            )
            .where(
                LivroGeneroCanonico.id_livro.in_(ids),
                GeneroCanonico.ativo.is_(True),
            )
        ):
            genres_by_book[book_id].append((genre_id, name))

    rating_rows = db.execute(
        select(
            Avaliacao.id_livro,
            func.avg(Avaliacao.nota),
            func.count(Avaliacao.id_avaliacao),
        )
        .where(Avaliacao.is_removida.is_(False), Avaliacao.id_livro.in_(ids))
        .group_by(Avaliacao.id_livro)
    ).all()
    ratings = {book_id: (float(average), int(count)) for book_id, average, count in rating_rows}
    total_accesses = dict(
        db.execute(
            select(AcessoLivro.id_livro, func.count(AcessoLivro.id_acesso))
            .where(AcessoLivro.id_livro.in_(ids))
            .group_by(AcessoLivro.id_livro)
        ).all()
    )

    since = datetime.now(UTC) - timedelta(days=7)
    weekly_events = db.execute(
        select(
            AcessoLivro.id_livro,
            AcessoLivro.id_usuario,
            AcessoLivro.data_hora,
        ).where(AcessoLivro.data_hora >= since, AcessoLivro.id_livro.in_(ids))
    ).all()
    authenticated_days: set[tuple[int, int, object]] = set()
    anonymous_accesses: Counter[int] = Counter()
    for book_id, user_id, accessed_at in weekly_events:
        if user_id is None:
            anonymous_accesses[book_id] += 1
        else:
            authenticated_days.add((book_id, user_id, accessed_at.date()))
    authenticated_accesses = Counter(book_id for book_id, _, _ in authenticated_days)
    weekly_scores = {
        book_id: authenticated_accesses[book_id] + anonymous_accesses[book_id] * 0.25
        for book_id in set(authenticated_accesses) | set(anonymous_accesses)
    }
    weekly_counts = {
        book_id: authenticated_accesses[book_id] + anonymous_accesses[book_id]
        for book_id in set(authenticated_accesses) | set(anonymous_accesses)
    }
    return (
        authors_by_book,
        genres_by_book,
        ratings,
        total_accesses,
        weekly_scores,
        weekly_counts,
    )


def _public_books(db: DB) -> list[Livro]:
    return list(
        db.scalars(
            select(Livro)
            .where(Livro.status_publicacao == "publicado", Livro.status_bloqueado.is_(False))
            .order_by(Livro.id_livro.desc())
        ).all()
    )


def _feed_book_payload(
    db: DB,
    books_by_id: dict[int, Livro],
    book_ids: list[int],
    ratings: dict[int, tuple[float, int]],
    total_accesses: dict[int, int],
) -> dict[int, dict]:
    enriched = catalog_books(db, [books_by_id[book_id] for book_id in book_ids])
    return {
        item["id_livro"]: {
            **item,
            "nota_media": ratings.get(item["id_livro"], (0, 0))[0],
            "total_avaliacoes": ratings.get(item["id_livro"], (0, 0))[1],
            "total_acessos": int(total_accesses.get(item["id_livro"], 0)),
        }
        for item in enriched
    }


@router.get("/books/trending", response_model=list[RecommendationPublic])
def trending_books(
    db: DB,
    limit: int = Query(default=12, ge=1, le=50),
) -> list[dict]:
    books = _public_books(db)
    if not books:
        return []
    books_by_id = {book.id_livro: book for book in books}
    (
        _authors,
        _genres,
        ratings,
        total_accesses,
        weekly_scores,
        weekly_counts,
    ) = _book_context(db, books)
    global_average = (
        sum(average * count for average, count in ratings.values())
        / sum(count for _, count in ratings.values())
        if ratings
        else 0
    )

    def rank(book: Livro):
        average, count = ratings.get(book.id_livro, (0, 0))
        bayesian_rating = (count * average + 5 * global_average) / (count + 5)
        return (
            weekly_scores.get(book.id_livro, 0),
            bayesian_rating,
            total_accesses.get(book.id_livro, 0),
            book.id_livro,
        )

    ranked = sorted(books, key=rank, reverse=True)[:limit]
    payloads = _feed_book_payload(
        db, books_by_id, [book.id_livro for book in ranked], ratings, total_accesses
    )
    result = []
    for book in ranked:
        weekly_count = weekly_counts.get(book.id_livro, 0)
        reason = (
            f"{weekly_count} read{'s' if weekly_count != 1 else ''} this week"
            if weekly_count
            else "Popular with LivrUSP readers"
        )
        result.append(
            {"book": payloads[book.id_livro], "reason": reason, "reason_type": "trending"}
        )
    return result


@router.get("/me/recommendations", response_model=list[RecommendationPublic])
def recommendations(
    db: DB,
    user: Reader,
    limit: int = Query(default=12, ge=1, le=50),
) -> list[dict]:
    books = _public_books(db)
    if not books:
        return []
    books_by_id = {book.id_livro: book for book in books}
    (
        authors_by_book,
        genres_by_book,
        ratings,
        total_accesses,
        weekly_scores,
        _weekly_counts,
    ) = _book_context(db, books)

    interaction_weights: Counter[int] = Counter()
    completed_ids: set[int] = set()
    preference_rows = db.execute(
        select(
            PreferenciaGeneroUsuario.id_genero_canonico,
            PreferenciaGeneroUsuario.tipo,
        ).where(PreferenciaGeneroUsuario.id_usuario == user.id)
    ).all()
    interested_genres = {genre_id for genre_id, kind in preference_rows if kind == "interesse"}
    excluded_genres = {genre_id for genre_id, kind in preference_rows if kind == "nao_interessa"}
    for progress in db.scalars(
        select(ProgressoLeitura).where(ProgressoLeitura.id_usuario == user.id)
    ):
        interaction_weights[progress.id_livro] += 5 if progress.concluido_em else 2
        if progress.concluido_em:
            completed_ids.add(progress.id_livro)
    for item in db.scalars(select(ItemLista).where(ItemLista.id_usuario == user.id)):
        interaction_weights[item.id_livro] += 3 if item.tipo == "favorito" else 1
    for review in db.scalars(
        select(Avaliacao).where(Avaliacao.id_usuario == user.id, Avaliacao.is_removida.is_(False))
    ):
        interaction_weights[review.id_livro] += _rating_weight(review.nota)
    for book_id, active_seconds in db.execute(
        select(
            SessaoLeitura.id_livro,
            func.coalesce(func.sum(SessaoLeitura.tempo_ativo_segundos), 0),
        )
        .where(SessaoLeitura.id_usuario == user.id)
        .group_by(SessaoLeitura.id_livro)
    ):
        interaction_weights[book_id] += min(float(active_seconds) / 1800, 2)

    genre_affinity: Counter[int] = Counter()
    author_affinity: Counter[int] = Counter()
    genre_names = {
        genre_id: name
        for genre_id, name in db.execute(
            select(GeneroCanonico.id_genero_canonico, GeneroCanonico.nome).where(
                GeneroCanonico.id_genero_canonico.in_(interested_genres)
            )
        )
    }
    for genre_id in interested_genres:
        # Explicit onboarding choices are a strong signal until reading history takes over.
        genre_affinity[genre_id] += 4
    for book_id, weight in interaction_weights.items():
        for genre_id, name in genres_by_book[book_id]:
            if len(name.strip()) < 3:
                continue
            genre_affinity[genre_id] += weight
        for author_id, _ in authors_by_book[book_id]:
            author_affinity[author_id] += weight

    max_genre = max((value for value in genre_affinity.values() if value > 0), default=0)
    max_author = max((value for value in author_affinity.values() if value > 0), default=0)
    max_weekly = max((log1p(value) for value in weekly_scores.values()), default=0)
    has_preferences = max_genre > 0 or max_author > 0
    global_average = (
        sum(average * count for average, count in ratings.values())
        / sum(count for _, count in ratings.values())
        if ratings
        else 0
    )
    candidates = [
        book
        for book in books
        if book.id_livro not in completed_ids
        and not {genre_id for genre_id, _name in genres_by_book[book.id_livro]}.intersection(
            excluded_genres
        )
    ]
    ranked: list[tuple[float, int, str, str]] = []

    for book in candidates:
        book_id = book.id_livro
        genre_values = [
            (genre_affinity[genre_id], name)
            for genre_id, name in genres_by_book[book_id]
            if len(name.strip()) >= 3
        ]
        author_values = [
            (author_affinity[author_id], name) for author_id, name in authors_by_book[book_id]
        ]
        best_genre = max(genre_values, default=(0, ""))
        best_author = max(author_values, default=(0, ""))
        genre_score = _normalize(max(best_genre[0], 0), max_genre)
        author_score = _normalize(max(best_author[0], 0), max_author)
        weekly_score = _normalize(log1p(weekly_scores.get(book_id, 0)), max_weekly)
        average, count = ratings.get(book_id, (0, 0))
        bayesian_rating = (count * average + 5 * global_average) / (count + 5)
        rating_score = bayesian_rating / 5 if global_average else 0

        if has_preferences:
            score = (
                0.5 * genre_score + 0.25 * author_score + 0.15 * weekly_score + 0.1 * rating_score
            )
            if genre_score >= author_score and genre_score > 0:
                genre_name = genre_names.get(best_genre[0], best_genre[1])
                reason, reason_type = f"Because you enjoy {genre_name}", "genre"
            elif author_score > 0:
                reason, reason_type = f"Because you read {best_author[1]}", "author"
            elif weekly_score > 0:
                reason, reason_type = "Trending among readers this week", "trending"
            elif rating_score > 0:
                reason, reason_type = "Recommended for its reader ratings", "rating"
            else:
                reason, reason_type = "A new discovery for your shelf", "discovery"
        else:
            age_days = max(0, (datetime.now(UTC).date() - book.data_publicacao).days)
            freshness = 1 / (1 + age_days / 365)
            score = 0.55 * weekly_score + 0.35 * rating_score + 0.1 * freshness
            if weekly_score > 0:
                reason, reason_type = "Trending among readers this week", "trending"
            elif rating_score > 0:
                reason, reason_type = "A reader favorite to get you started", "rating"
            else:
                reason, reason_type = "A new discovery for your shelf", "discovery"
        ranked.append((score, book_id, reason, reason_type))

    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    selected = _select_diverse(ranked, authors_by_book, genres_by_book, limit)
    payloads = _feed_book_payload(
        db, books_by_id, [item[1] for item in selected], ratings, total_accesses
    )
    return [
        {"book": payloads[book_id], "reason": reason, "reason_type": reason_type}
        for _score, book_id, reason, reason_type in selected
    ]
