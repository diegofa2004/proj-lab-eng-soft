"""Download and associate cover images for imported Project Gutenberg books.

The operation is resumable: records that already have a ``capa_livro`` row
are skipped, so it is safe to run again after an interrupted download.
"""

import argparse
import time
from urllib.parse import urlencode, urlparse

from sqlalchemy import select

from app.db.base import CapaLivro, Livro
from app.db.session import SessionLocal
from scripts.import_gutenberg import GUTENBERG_HOSTS, GUTENDEX_URL, get_json
from scripts.import_gutenberg_top100 import download_cover, save_cover


def trusted_cover_url(book: dict) -> str | None:
    url = book.get("formats", {}).get("image/jpeg")
    if not isinstance(url, str) or urlparse(url).hostname not in GUTENBERG_HOSTS:
        return None
    return url


def catalog_cover_urls(gutenberg_ids: set[int], user_agent: str) -> dict[int, str]:
    """Resolve cover URLs page-by-page instead of issuing one API request per book."""
    remaining = set(gutenberg_ids)
    covers: dict[int, str] = {}
    url: str | None = f"{GUTENDEX_URL}?{urlencode({'languages': 'en'})}"
    while url and remaining:
        page = get_json(url, user_agent)
        for book in page.get("results", []):
            gutenberg_id = book.get("id")
            if gutenberg_id not in remaining:
                continue
            source_url = trusted_cover_url(book)
            if source_url:
                covers[gutenberg_id] = source_url
            remaining.remove(gutenberg_id)
        url = page.get("next")
    return covers


def books_missing_covers(limit: int | None) -> list[tuple[int, int]]:
    statement = (
        select(Livro.id_livro, Livro.gutenberg_id)
        .outerjoin(CapaLivro, CapaLivro.id_livro == Livro.id_livro)
        .where(Livro.gutenberg_id.is_not(None), CapaLivro.id_livro.is_(None))
        .order_by(Livro.id_livro)
    )
    if limit is not None:
        statement = statement.limit(limit)
    with SessionLocal() as db:
        return [(local_id, gutenberg_id) for local_id, gutenberg_id in db.execute(statement)]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="Maximum number of missing covers to process")
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds between downloads")
    parser.add_argument(
        "--user-agent",
        required=True,
        help="Descriptive User-Agent including a contact address or URL",
    )
    args = parser.parse_args()
    if args.limit is not None and args.limit <= 0:
        parser.error("limit must be positive")
    if args.delay < 0:
        parser.error("delay cannot be negative")

    rows = books_missing_covers(args.limit)
    cover_urls = catalog_cover_urls({gutenberg_id for _, gutenberg_id in rows}, args.user_agent)
    imported = unavailable = failed = 0
    for local_id, gutenberg_id in rows:
        try:
            source_url = cover_urls.get(gutenberg_id)
            if source_url is None:
                unavailable += 1
                print(f"book #{local_id}: no trusted cover for Gutenberg #{gutenberg_id}")
                continue
            temporary_cover = download_cover(source_url, args.user_agent)
            save_cover(local_id, temporary_cover, source_url)
            imported += 1
            print(f"book #{local_id}: imported cover for Gutenberg #{gutenberg_id}")
        except Exception as exc:  # Continue with the remaining public-domain books.
            failed += 1
            print(f"book #{local_id}: failed cover for Gutenberg #{gutenberg_id}: {exc}")
        time.sleep(args.delay)
    print(f"Done: {imported} imported, {unavailable} unavailable, {failed} failed.")


if __name__ == "__main__":
    main()
