from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.db.base import Capitulo, Livro
from app.writing import book_metrics, count_words, summary_payload


class FakeSession:
    def __init__(self, chapters: list[Capitulo]):
        self.chapters = chapters

    def scalars(self, _statement):
        return self.chapters


def make_book(book_id: int = 1) -> Livro:
    return Livro(
        id_livro=book_id,
        titulo="My story",
        descricao="",
        data_publicacao=datetime.now(UTC).date(),
        arquivo_conteudo=f"/v2/books/{book_id}/content",
        total_paginas=10,
        origem="usuario",
        status_publicacao="rascunho",
        status_bloqueado=False,
        id_publicador=1,
        criado_em=datetime.now(UTC) - timedelta(days=2),
    )


def make_chapter(
    book: Livro, chapter_id: int, order: int, words: str, updated: datetime
) -> Capitulo:
    return Capitulo(
        id_capitulo=chapter_id,
        id_livro=book.id_livro,
        ordem=order,
        titulo=f"Chapter {order}",
        conteudo=words,
        versao=1,
        atualizado_em=updated,
        criado_em=updated,
    )


def test_count_words_ignores_extra_whitespace():
    assert count_words("  one\ntwo\tthree  ") == 3
    assert count_words("") == 0


def test_metrics_are_derived_from_chapters():
    book = make_book()
    now = datetime.now(UTC)
    chapters = [
        make_chapter(book, 1, 1, "one two", now - timedelta(days=1)),
        make_chapter(book, 2, 2, "three", now),
    ]

    metrics = book_metrics(FakeSession(chapters), [book])[book.id_livro]

    assert metrics.total_capitulos == 2
    assert metrics.total_palavras == 3
    assert metrics.atualizado_em == now


def test_metrics_fall_back_to_book_creation_when_there_are_no_chapters():
    book = make_book()

    metrics = book_metrics(FakeSession([]), [book])[book.id_livro]

    assert metrics.total_capitulos == 0
    assert metrics.total_palavras == 0
    assert metrics.atualizado_em == book.criado_em


def test_summary_payload_exposes_derived_fields(tmp_path: Path):
    book = make_book()
    metrics = book_metrics(FakeSession([]), [book])[book.id_livro]
    (tmp_path / f"{book.id_livro}.epub").touch()

    payload = summary_payload(book, metrics, True, tmp_path)

    assert payload["total_capitulos"] == 0
    assert payload["total_palavras"] == 0
    assert payload["tem_epub"] is True
    assert payload["pode_publicar"] is True
    assert payload["atualizado_em"] == book.criado_em
