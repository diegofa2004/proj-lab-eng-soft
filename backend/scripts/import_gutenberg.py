"""Import public-domain EPUB3 books from Project Gutenberg into the local catalog.

Gutendex supplies Project Gutenberg's metadata and direct Gutenberg download URLs.
The importer downloads one book at a time, so it can resume safely after an
interruption and does not create duplicate catalog entries.
"""

import argparse
import json
import tempfile
import time
from datetime import date
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from sqlalchemy import select

from app.api.endpoints.catalog import CONTENT, MAX_BYTES, validate_epub
from app.db.base import Autor, Genero, Livro, LivroAutor, LivroGenero
from app.db.session import SessionLocal
from app.epub_progress import epub_progress_positions
from app.gutenberg_metadata import fetch_gutenberg_synopsis

GUTENDEX_URL = "https://gutendex.com/books"
GUTENBERG_HOSTS = {"gutenberg.org", "www.gutenberg.org"}


def get_json(url: str, user_agent: str) -> dict:
    request = Request(url, headers={"User-Agent": user_agent, "Accept": "application/json"})
    with urlopen(request, timeout=30) as response:  # noqa: S310 - URL is the known API or its next URL
        return json.load(response)


def gutenberg_epub_url(book: dict) -> str | None:
    url = book.get("formats", {}).get("application/epub+zip")
    if not isinstance(url, str) or urlparse(url).hostname not in GUTENBERG_HOSTS:
        return None
    return url


def already_imported(book_id: int) -> bool:
    with SessionLocal() as db:
        return db.scalar(select(Livro.id_livro).where(Livro.gutenberg_id == book_id)) is not None


def download_epub(url: str, user_agent: str) -> Path:
    CONTENT.mkdir(exist_ok=True)
    request = Request(url, headers={"User-Agent": user_agent, "Accept": "application/epub+zip"})
    path: Path | None = None
    try:
        with urlopen(
            request, timeout=60
        ) as response:  # noqa: S310 - hostname checked by gutenberg_epub_url
            size = response.headers.get("Content-Length")
            if size and int(size) > MAX_BYTES:
                raise ValueError("file exceeds the 50 MiB limit")
            with tempfile.NamedTemporaryFile(dir=CONTENT, delete=False) as output:
                path = Path(output.name)
                total = 0
                while chunk := response.read(64 * 1024):
                    total += len(chunk)
                    if total > MAX_BYTES:
                        raise ValueError("file exceeds the 50 MiB limit")
                    output.write(chunk)
        assert path is not None
        validate_epub(path)
        return path
    except Exception:
        if path is not None:
            path.unlink(missing_ok=True)
        raise


def get_or_create(db, model, name: str):
    row = db.scalar(select(model).where(model.nome == name))
    if row is None:
        row = model(nome=name)
        db.add(row)
        db.flush()
    return row


def import_book(book: dict, epub: Path, catalog_date: date, max_genres: int) -> int:
    book_id = int(book["id"])
    authors = [entry.get("name", "").strip() for entry in book.get("authors", [])]
    subjects = [subject.strip() for subject in book.get("subjects", []) if subject.strip()]
    title = str(book["title"]).strip()[:300]
    if not title:
        raise ValueError("missing title")
    total_positions = epub_progress_positions(epub)

    target: Path | None = None
    try:
        with SessionLocal.begin() as db:
            row = Livro(
                titulo=title,
                descricao=str(book.get("description") or "").strip(),
                gutenberg_id=book_id,
                data_publicacao=catalog_date,
                arquivo_conteudo="pending",
                # EPUBs are reflowable, so this stores stable reading positions, not physical pages.
                total_paginas=total_positions,
                origem="catalogo",
                status_publicacao="publicado",
                id_publicador=None,
            )
            db.add(row)
            db.flush()
            target = CONTENT / f"{row.id_livro}.epub"
            epub.replace(target)
            row.arquivo_conteudo = f"/v2/books/{row.id_livro}/content"

            for name in dict.fromkeys(authors):
                if name:
                    author = get_or_create(db, Autor, name[:200])
                    db.add(LivroAutor(id_livro=row.id_livro, id_autor=author.id_autor))
            for name in dict.fromkeys(subjects[:max_genres]):
                genre = get_or_create(db, Genero, name[:100])
                db.add(LivroGenero(id_livro=row.id_livro, id_genero=genre.id_genero))
            return row.id_livro
    except Exception:
        epub.unlink(missing_ok=True)
        if target is not None:
            target.unlink(missing_ok=True)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, required=True, help="Number of books to import")
    parser.add_argument("--language", default="en", help="Gutendex language code (default: en)")
    parser.add_argument(
        "--delay", type=float, default=2.0, help="Seconds between Gutenberg downloads"
    )
    parser.add_argument(
        "--max-genres", type=int, default=3, help="Maximum Gutenberg subjects per book"
    )
    parser.add_argument(
        "--catalog-date",
        type=date.fromisoformat,
        default=date(2000, 1, 1),
        help="Date stored for imported records, YYYY-MM-DD (default: 2000-01-01)",
    )
    parser.add_argument(
        "--user-agent",
        required=True,
        help="Descriptive User-Agent including a contact address or URL",
    )
    args = parser.parse_args()
    if args.limit <= 0 or args.delay < 0 or args.max_genres < 0:
        parser.error("limit must be positive; delay and max-genres cannot be negative")

    url = f"{GUTENDEX_URL}?{urlencode({'languages': args.language})}"
    imported = skipped = failed = 0
    while url and imported < args.limit:
        page = get_json(url, args.user_agent)
        for book in page.get("results", []):
            if imported >= args.limit:
                break
            book_id = int(book["id"])
            epub_url = gutenberg_epub_url(book)
            if epub_url is None or already_imported(book_id):
                skipped += 1
                continue
            try:
                book["description"] = fetch_gutenberg_synopsis(book_id, args.user_agent)
                temporary_epub = download_epub(epub_url, args.user_agent)
                local_id = import_book(book, temporary_epub, args.catalog_date, args.max_genres)
                imported += 1
                print(f"imported Gutenberg #{book_id} as catalog book #{local_id}: {book['title']}")
            except Exception as exc:  # Continue with the remaining candidates.
                failed += 1
                print(f"skipped Gutenberg #{book_id}: {exc}")
            time.sleep(args.delay)
        url = page.get("next")
    print(f"Done: {imported} imported, {skipped} skipped, {failed} failed.")


if __name__ == "__main__":
    main()
