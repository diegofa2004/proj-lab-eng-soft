import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import Capitulo, Livro
from app.schemas.livro import LivroPublic

MAX_CHAPTERS = 200
MAX_CHAPTER_CHARS = 1024 * 1024
WORD_PATTERN = re.compile(r"\S+")


@dataclass(frozen=True)
class BookMetrics:
    total_capitulos: int
    total_palavras: int
    atualizado_em: datetime


def count_words(text: str) -> int:
    return len(WORD_PATTERN.findall(text or ""))


def book_metrics(db: Session, books: list[Livro]) -> dict[int, BookMetrics]:
    if not books:
        return {}

    chapters = defaultdict(list)
    for chapter in db.scalars(
        select(Capitulo).where(Capitulo.id_livro.in_([book.id_livro for book in books]))
    ):
        chapters[chapter.id_livro].append(chapter)

    metrics = {}
    for book in books:
        book_chapters = chapters[book.id_livro]
        updated = max(
            (chapter.atualizado_em for chapter in book_chapters),
            default=book.criado_em,
        )
        metrics[book.id_livro] = BookMetrics(
            total_capitulos=len(book_chapters),
            total_palavras=sum(count_words(chapter.conteudo) for chapter in book_chapters),
            atualizado_em=updated,
        )
    return metrics


def summary_payload(
    book: Livro,
    metrics: BookMetrics,
    pode_publicar: bool,
    content_dir: Path,
) -> dict:
    return {
        **LivroPublic.model_validate(book).model_dump(),
        "atualizado_em": metrics.atualizado_em,
        "total_capitulos": metrics.total_capitulos,
        "total_palavras": metrics.total_palavras,
        "tem_epub": (content_dir / f"{book.id_livro}.epub").is_file(),
        "pode_publicar": pode_publicar,
    }
