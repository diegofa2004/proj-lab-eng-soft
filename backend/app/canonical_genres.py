import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.genero import Genero
from app.models.genero_canonico import GeneroCanonico
from app.models.livro import Livro
from app.models.livro_genero import LivroGenero
from app.models.livro_genero_canonico import LivroGeneroCanonico
from app.models.regra_genero_canonico import RegraGeneroCanonico


@dataclass(frozen=True)
class CanonicalMatch:
    genre_id: int
    confidence: float


def normalize_subject(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", normalized.casefold()).strip()


def _matches(subject: str, rule_type: str, pattern: str) -> bool:
    if rule_type == "exact":
        return subject == pattern
    if rule_type == "starts_with":
        return subject.startswith(pattern)
    if rule_type == "ends_with":
        return subject.endswith(pattern)
    return pattern in subject


def classify_subjects(
    subjects: list[str], rules: list[RegraGeneroCanonico], *, limit: int = 3
) -> list[CanonicalMatch]:
    """Classify raw subjects with DB rules; longer matches shadow generic substrings."""
    scores: dict[int, float] = defaultdict(float)
    priorities: dict[int, int] = defaultdict(int)
    for raw_subject in subjects:
        subject = normalize_subject(raw_subject)
        matching = []
        for rule in rules:
            pattern = normalize_subject(rule.padrao)
            if rule.ativo and pattern and _matches(subject, rule.tipo, pattern):
                matching.append((rule, pattern))
        filtered = [
            (rule, pattern)
            for rule, pattern in matching
            if not any(
                pattern != other_pattern
                and pattern in other_pattern
                and len(other_pattern) > len(pattern)
                for _other_rule, other_pattern in matching
            )
        ]
        for rule, _pattern in filtered:
            scores[rule.id_genero_canonico] += rule.peso
            priorities[rule.id_genero_canonico] = max(
                priorities[rule.id_genero_canonico], rule.prioridade
            )
    ranked = sorted(
        (
            genre_id
            for genre_id in scores
            if scores[genre_id] >= 0.5 or not any(score >= 0.5 for score in scores.values())
        ),
        key=lambda genre_id: (scores[genre_id], priorities[genre_id], -genre_id),
        reverse=True,
    )
    return [
        CanonicalMatch(genre_id=genre_id, confidence=min(1.0, scores[genre_id]))
        for genre_id in ranked[:limit]
    ]


def active_rules(db: Session) -> list[RegraGeneroCanonico]:
    return list(
        db.scalars(
            select(RegraGeneroCanonico)
            .join(GeneroCanonico)
            .where(RegraGeneroCanonico.ativo.is_(True), GeneroCanonico.ativo.is_(True))
            .order_by(RegraGeneroCanonico.prioridade.desc(), RegraGeneroCanonico.id_regra)
        ).all()
    )


def classify_book(
    db: Session,
    book_id: int,
    *,
    rules: list[RegraGeneroCanonico] | None = None,
    preserve_manual: bool = True,
) -> int:
    subjects = list(
        db.scalars(
            select(Genero.nome)
            .join(LivroGenero, LivroGenero.id_genero == Genero.id_genero)
            .where(LivroGenero.id_livro == book_id)
        ).all()
    )
    existing_manual = (
        set(
            db.scalars(
                select(LivroGeneroCanonico.id_genero_canonico).where(
                    LivroGeneroCanonico.id_livro == book_id,
                    LivroGeneroCanonico.origem == "manual",
                )
            ).all()
        )
        if preserve_manual
        else set()
    )
    condition = [LivroGeneroCanonico.id_livro == book_id]
    if preserve_manual:
        condition.append(LivroGeneroCanonico.origem == "automatico")
    db.execute(delete(LivroGeneroCanonico).where(*condition))
    matches = classify_subjects(subjects, rules if rules is not None else active_rules(db))
    added = 0
    for index, match in enumerate(matches):
        if match.genre_id in existing_manual:
            continue
        db.add(
            LivroGeneroCanonico(
                id_livro=book_id,
                id_genero_canonico=match.genre_id,
                confianca=match.confidence,
                origem="automatico",
                principal=index == 0 and not existing_manual,
            )
        )
        added += 1
    return added


def reclassify_all_books(db: Session) -> tuple[int, int]:
    rules = active_rules(db)
    book_ids = list(db.scalars(select(Livro.id_livro).order_by(Livro.id_livro)).all())
    classified = sum(classify_book(db, book_id, rules=rules) > 0 for book_id in book_ids)
    return len(book_ids), classified
