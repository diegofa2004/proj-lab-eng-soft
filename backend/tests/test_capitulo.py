import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import Base
from app.models.capitulo import Capitulo
from app.schemas.capitulo import CapituloCreate, CapituloUpdate


def make_session(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path}/chapters.db",
        execution_options={"schema_translate_map": {"plataforma": None}},
    )
    Base.metadata.create_all(bind=engine, tables=[Capitulo.__table__])
    return Session(engine)


def test_chapter_order_is_unique_per_book(tmp_path):
    with make_session(tmp_path) as db:
        db.add(Capitulo(id_livro=1, ordem=1, titulo="Opening"))
        db.commit()
        db.add(Capitulo(id_livro=1, ordem=1, titulo="Duplicate"))

        with pytest.raises(IntegrityError):
            db.commit()


def test_duplicate_order_is_allowed_across_books(tmp_path):
    with make_session(tmp_path) as db:
        db.add_all(
            [
                Capitulo(id_livro=1, ordem=1, titulo="One"),
                Capitulo(id_livro=2, ordem=1, titulo="Two"),
            ]
        )
        db.commit()

        assert db.query(Capitulo).count() == 2


def test_reordering_with_temporary_offsets_keeps_positive_orders(tmp_path):
    with make_session(tmp_path) as db:
        first = Capitulo(id_livro=1, ordem=1, titulo="First")
        second = Capitulo(id_livro=1, ordem=2, titulo="Second")
        db.add_all([first, second])
        db.commit()

        offset = 1000
        first.ordem = offset + 1
        second.ordem = offset + 2
        db.flush()
        first.ordem = 2
        second.ordem = 1
        db.commit()

        assert (first.ordem, second.ordem) == (2, 1)


def test_chapter_contracts_validate_title_and_content_size():
    assert CapituloCreate(titulo="Opening").conteudo == ""
    with pytest.raises(ValueError):
        CapituloCreate(titulo="   ")
    with pytest.raises(ValueError):
        CapituloCreate(titulo="Long", conteudo="x" * (1024 * 1024 + 1))
    with pytest.raises(ValueError):
        CapituloUpdate(titulo="Missing version")  # type: ignore[call-arg]
