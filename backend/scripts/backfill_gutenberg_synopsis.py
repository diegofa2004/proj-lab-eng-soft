"""Replace the old source note with Project Gutenberg's work synopsis.

Run after the gutenberg_id migration. Existing editorial descriptions are not changed.
"""

import argparse
import time

from sqlalchemy import select

from app.db.base import Livro
from app.db.session import SessionLocal
from app.gutenberg_metadata import fetch_gutenberg_synopsis


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds between RDF requests")
    parser.add_argument("--limit", type=int, default=None, help="Maximum books to examine")
    parser.add_argument(
        "--user-agent", default="LivrUSP academic catalog synopsis backfill",
        help="Descriptive User-Agent sent to Project Gutenberg",
    )
    args = parser.parse_args()
    if args.delay < 0 or (args.limit is not None and args.limit <= 0):
        parser.error("delay cannot be negative and limit must be positive")

    with SessionLocal() as db:
        query = (
            select(Livro.id_livro, Livro.gutenberg_id)
            .where(Livro.gutenberg_id.is_not(None))
            .where(Livro.descricao.like("Fonte: Project Gutenberg ebook #%"))
            .order_by(Livro.id_livro)
        )
        if args.limit is not None:
            query = query.limit(args.limit)
        candidates = db.execute(query).all()

    updated = missing = failed = 0
    for local_id, gutenberg_id in candidates:
        try:
            synopsis = fetch_gutenberg_synopsis(gutenberg_id, args.user_agent)
            if synopsis:
                with SessionLocal.begin() as db:
                    book = db.get(Livro, local_id)
                    if book and book.descricao.startswith("Fonte: Project Gutenberg ebook #"):
                        book.descricao = synopsis
                        updated += 1
                        print(f"updated book #{local_id} (Gutenberg #{gutenberg_id})", flush=True)
            else:
                missing += 1
                print(f"no synopsis for Gutenberg #{gutenberg_id}", flush=True)
        except Exception as exc:
            failed += 1
            print(f"failed Gutenberg #{gutenberg_id}: {exc}", flush=True)
        time.sleep(args.delay)
    print(f"Done: {updated} updated, {missing} missing, {failed} failed.", flush=True)


if __name__ == "__main__":
    main()
