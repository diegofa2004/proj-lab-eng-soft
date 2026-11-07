"""Read work summaries published in Project Gutenberg's per-ebook RDF catalog."""

import xml.etree.ElementTree as element_tree
from urllib.request import Request, urlopen

PG_TERMS = "http://www.gutenberg.org/2009/pgterms/"


def synopsis_from_rdf(root: element_tree.Element) -> str:
    ebook = root.find(f"{{{PG_TERMS}}}ebook")
    if ebook is None:
        return ""
    summary = ebook.findtext(f"{{{PG_TERMS}}}marc520")
    return " ".join(summary.split()) if summary else ""


def fetch_gutenberg_synopsis(book_id: int, user_agent: str) -> str:
    request = Request(
        f"https://www.gutenberg.org/ebooks/{book_id}.rdf",
        headers={"User-Agent": user_agent, "Accept": "application/rdf+xml"},
    )
    with urlopen(request, timeout=30) as response:  # noqa: S310 - fixed Project Gutenberg URL
        root = element_tree.fromstring(response.read())
    return synopsis_from_rdf(root)
