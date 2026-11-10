"""Recalculate reading positions for EPUB files already stored by LivrUSP."""

import argparse

from sqlalchemy import select

from app.api.endpoints.catalog import CONTENT
from app.db.base import Livro, ProgressoLeitura
from app.db.session import SessionLocal
from app.epub_progress import epub_progress_positions


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist changes; without this flag the command only reports them",
    )
    args = parser.parse_args()

    changed = missing = reset_completions = 0
    with SessionLocal.begin() as db:
        books = db.scalars(select(Livro).order_by(Livro.id_livro)).all()
        for book in books:
            path = CONTENT / f"{book.id_livro}.epub"
            if not path.is_file():
                missing += 1
                continue
            total_positions = epub_progress_positions(path)
            if total_positions == book.total_paginas:
                continue

            progress_rows = db.scalars(
                select(ProgressoLeitura).where(ProgressoLeitura.id_livro == book.id_livro)
            ).all()
            total_positions = max(
                total_positions,
                max((progress.paginas_distintas_lidas for progress in progress_rows), default=0),
            )
            print(
                f"book #{book.id_livro}: {book.total_paginas} -> {total_positions} positions "
                f"({book.titulo})"
            )
            changed += 1
            if not args.apply:
                continue

            old_total = book.total_paginas
            book.total_paginas = total_positions
            # The old one-position imports completed on their first progress event.
            if book.gutenberg_id is not None and old_total == 1 and total_positions > 1:
                for progress in progress_rows:
                    if progress.concluido_em is not None and progress.paginas_distintas_lidas == 1:
                        progress.concluido_em = None
                        reset_completions += 1

        if not args.apply:
            db.rollback()

    mode = "updated" if args.apply else "would update"
    print(
        f"Done: {mode} {changed} books; {missing} files missing; "
        f"{reset_completions} premature completions reset."
    )


if __name__ == "__main__":
    main()
