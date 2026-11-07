"""Import the English EPUB3 books in Project Gutenberg's Top 100 for the last 30 days."""

import argparse
import re
import tempfile
import time
import xml.etree.ElementTree as element_tree
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from app.api.endpoints.catalog import CONTENT
from app.db.base import CapaLivro
from app.db.session import SessionLocal
from scripts.import_gutenberg import (
    GUTENBERG_HOSTS,
    already_imported,
    download_epub,
    import_book,
)

TOP_100_URL = "https://www.gutenberg.org/browse/scores/top"
MAX_COVER_BYTES = 10 * 1024 * 1024
BOOK_LINK = re.compile(r"^/ebooks/(\d+)$")
NAMESPACES = {
    "dcterms": "http://purl.org/dc/terms/",
    "pgterms": "http://www.gutenberg.org/2009/pgterms/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
}


class Last30DaysBooksParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._target_heading = False
        self._waiting_for_list = False
        self._inside_list = False
        self.book_ids: list[int] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "h2" and attributes.get("id") == "books-last30":
            self._target_heading = True
        elif tag == "ol" and self._waiting_for_list:
            self._inside_list = True
            self._waiting_for_list = False
        elif tag == "a" and self._inside_list:
            match = BOOK_LINK.fullmatch(attributes.get("href", ""))
            if match:
                self.book_ids.append(int(match.group(1)))

    def handle_endtag(self, tag: str) -> None:
        if tag == "h2" and self._target_heading:
            self._target_heading = False
            self._waiting_for_list = True
        elif tag == "ol" and self._inside_list:
            self._inside_list = False


def top_100_ids(user_agent: str) -> list[int]:
    request = Request(TOP_100_URL, headers={"User-Agent": user_agent})
    with urlopen(request, timeout=30) as response:  # noqa: S310 - fixed Project Gutenberg URL
        page = response.read().decode("utf-8", errors="replace")
    parser = Last30DaysBooksParser()
    parser.feed(page)
    if len(parser.book_ids) != 100 or len(set(parser.book_ids)) != 100:
        raise ValueError("Project Gutenberg Top 100 last-30-days section could not be parsed")
    return parser.book_ids


def gutenberg_metadata(book_id: int, user_agent: str) -> dict | None:
    request = Request(
        f"https://www.gutenberg.org/ebooks/{book_id}.rdf", headers={"User-Agent": user_agent}
    )
    with urlopen(request, timeout=30) as response:  # noqa: S310 - fixed Project Gutenberg URL
        root = element_tree.fromstring(response.read())
    ebook = root.find("pgterms:ebook", NAMESPACES)
    if ebook is None:
        raise ValueError("RDF does not contain ebook metadata")
    languages = {
        value.text
        for value in ebook.findall("dcterms:language/rdf:Description/rdf:value", NAMESPACES)
        if value.text
    }
    if "en" not in languages:
        return None

    formats: dict[str, str] = {}
    epub_candidates: list[str] = []
    for file in ebook.findall("dcterms:hasFormat/pgterms:file", NAMESPACES):
        url = file.attrib.get(f"{{{NAMESPACES['rdf']}}}about")
        mime = file.findtext("dcterms:format/rdf:Description/rdf:value", namespaces=NAMESPACES)
        if not url or urlparse(url).hostname not in GUTENBERG_HOSTS:
            continue
        if mime == "image/jpeg" and ".cover.medium.jpg" in url:
            formats["image/jpeg"] = url
        if mime == "application/epub+zip" and ".epub" in url:
            epub_candidates.append(url)
    epub_candidates.sort(
        key=lambda url: (".epub3.noimages" not in url, ".noimages" not in url, url)
    )
    if epub_candidates:
        formats["application/epub+zip"] = epub_candidates[0]

    title = ebook.findtext("dcterms:title", namespaces=NAMESPACES)
    if not title:
        raise ValueError("RDF does not contain a title")
    authors = []
    for agent in ebook.findall("dcterms:creator/pgterms:agent", NAMESPACES):
        name = agent.findtext("pgterms:name", namespaces=NAMESPACES)
        if name:
            authors.append({"name": name})
    subjects = [
        value.text
        for value in ebook.findall("dcterms:subject/rdf:Description/rdf:value", NAMESPACES)
        if value.text
    ]
    return {
        "id": book_id,
        "title": title,
        "authors": authors,
        "subjects": subjects,
        "formats": formats,
    }


def cover_url(book: dict) -> str | None:
    url = book.get("formats", {}).get("image/jpeg")
    if not isinstance(url, str) or urlparse(url).hostname not in GUTENBERG_HOSTS:
        return None
    return url


def download_cover(url: str, user_agent: str) -> Path:
    covers = CONTENT / "covers"
    covers.mkdir(parents=True, exist_ok=True)
    path: Path | None = None
    request = Request(url, headers={"User-Agent": user_agent, "Accept": "image/jpeg"})
    try:
        with urlopen(request, timeout=30) as response:  # noqa: S310 - hostname checked by cover_url
            with tempfile.NamedTemporaryFile(dir=covers, delete=False) as output:
                path = Path(output.name)
                size = 0
                while chunk := response.read(64 * 1024):
                    size += len(chunk)
                    if size > MAX_COVER_BYTES:
                        raise ValueError("cover exceeds the 10 MiB limit")
                    output.write(chunk)
        assert path is not None
        with path.open("rb") as image:
            if image.read(3) != b"\xff\xd8\xff":
                raise ValueError("cover is not a JPEG image")
        return path
    except Exception:
        if path is not None:
            path.unlink(missing_ok=True)
        raise


def save_cover(book_id: int, temporary_cover: Path, source_url: str) -> None:
    target = CONTENT / "covers" / f"{book_id}.jpg"
    try:
        temporary_cover.replace(target)
        with SessionLocal.begin() as db:
            db.merge(
                CapaLivro(
                    id_livro=book_id,
                    arquivo=f"/v2/books/{book_id}/cover",
                    tipo_mime="image/jpeg",
                    fonte_url=source_url,
                )
            )
    except Exception:
        target.unlink(missing_ok=True)
        temporary_cover.unlink(missing_ok=True)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=100, help="Maximum ranked books to consider")
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds between book downloads")
    parser.add_argument(
        "--catalog-date",
        type=date.fromisoformat,
        default=date(2000, 1, 1),
        help="Date stored for imported records, YYYY-MM-DD (default: 2000-01-01)",
    )
    parser.add_argument(
        "--user-agent",
        default="LivrUSP academic catalog importer",
        help="Descriptive HTTP User-Agent sent to Project Gutenberg and Gutendex",
    )
    args = parser.parse_args()
    if not 1 <= args.limit <= 100 or args.delay < 0:
        parser.error("limit must be between 1 and 100 and delay cannot be negative")

    ranked_ids = top_100_ids(args.user_agent)[: args.limit]
    imported = skipped = failed = 0
    for rank, gutenberg_id in enumerate(ranked_ids, start=1):
        try:
            book = gutenberg_metadata(gutenberg_id, args.user_agent)
        except Exception as exc:
            failed += 1
            print(f"rank {rank}: skipped Gutenberg #{gutenberg_id}: {exc}")
            continue
        if book is None:
            skipped += 1
            print(f"rank {rank}: skipped Gutenberg #{gutenberg_id} (not English EPUB3)")
            continue
        if already_imported(gutenberg_id):
            skipped += 1
            print(f"rank {rank}: skipped Gutenberg #{gutenberg_id} (already imported)")
            continue
        epub_url = book["formats"].get("application/epub+zip")
        if not isinstance(epub_url, str) or urlparse(epub_url).hostname not in GUTENBERG_HOSTS:
            skipped += 1
            print(f"rank {rank}: skipped Gutenberg #{gutenberg_id} (no trusted EPUB3 URL)")
            continue
        try:
            temporary_epub = download_epub(epub_url, args.user_agent)
            local_id = import_book(book, temporary_epub, args.catalog_date, max_genres=3)
            source_url = cover_url(book)
            if source_url:
                save_cover(local_id, download_cover(source_url, args.user_agent), source_url)
            imported += 1
            print(f"rank {rank}: imported Gutenberg #{gutenberg_id} as book #{local_id}")
        except Exception as exc:
            failed += 1
            print(f"rank {rank}: skipped Gutenberg #{gutenberg_id}: {exc}")
        time.sleep(args.delay)
    print(f"Done: {imported} imported, {skipped} skipped, {failed} failed.")


if __name__ == "__main__":
    main()
