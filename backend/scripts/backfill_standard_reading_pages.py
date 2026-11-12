"""Calculate 300-word standardized page totals for existing EPUB books."""

import argparse
from pathlib import Path

from sqlalchemy import select

from app.api.endpoints.catalog import CONTENT
from app.db.base import Livro
from app.db.session import SessionLocal
from app.epub_progress import epub_standard_pages


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Maximum number of books to process")
    args = parser.parse_args()
    if args.limit is not None and args.limit <= 0:
        parser.error("limit must be positive")

    statement = (
        select(Livro.id_livro)
        .where(Livro.paginas_padrao.is_(None))
        .order_by(Livro.id_livro)
    )
    if args.limit is not None:
        statement = statement.limit(args.limit)
    with SessionLocal() as db:
        book_ids = list(db.scalars(statement))

    updated = missing = failed = 0
    for book_id in book_ids:
        path = Path(CONTENT) / f"{book_id}.epub"
        if not path.is_file():
            missing += 1
            print(f"book #{book_id}: EPUB unavailable")
            continue
        try:
            pages = epub_standard_pages(path)
            with SessionLocal.begin() as db:
                book = db.get(Livro, book_id)
                if book is not None:
                    book.paginas_padrao = pages
            updated += 1
            print(f"book #{book_id}: {pages} standard pages")
        except ValueError as exc:
            failed += 1
            print(f"book #{book_id}: failed: {exc}")
    print(f"Done: {updated} updated, {missing} missing, {failed} failed.")


if __name__ == "__main__":
    main()
