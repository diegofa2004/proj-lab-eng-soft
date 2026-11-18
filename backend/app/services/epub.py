import html
import math
import re
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

WORDS_PER_PAGE = 300
MIME_TYPE = "application/epub+zip"
CONTAINER = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
"""
STYLES = """body { font-family: Georgia, serif; line-height: 1.6; margin: 2rem; }
h1 { font-size: 1.5rem; margin-bottom: 1.5rem; }
p { margin: 0 0 1rem 0; }
"""


@dataclass(frozen=True)
class ChapterSource:
    id: int
    ordem: int
    titulo: str
    conteudo: str


@dataclass(frozen=True)
class GeneratedEpub:
    total_palavras: int
    total_paginas: int
    identificador: str


def count_words(text: str) -> int:
    return len(re.findall(r"\S+", text or ""))


def estimate_pages(total_palavras: int) -> int:
    return max(1, math.ceil(total_palavras / WORDS_PER_PAGE))


def escape_xml(text: str) -> str:
    return html.escape(text, quote=True)


def build_paragraphs(conteudo: str) -> str:
    blocks = re.split(r"\n\s*\n", conteudo.strip())
    paragraphs = []
    for block in blocks:
        if not block.strip():
            continue
        lines = [escape_xml(line.strip()) for line in block.splitlines() if line.strip()]
        paragraphs.append(f"<p>{'<br />'.join(lines)}</p>")
    return "".join(paragraphs)


def book_identifier(book_id: int) -> str:
    return f"urn:uuid:{uuid5(NAMESPACE_URL, f'livrusp:book:{book_id}')}"


def generate_epub(
    path: Path,
    book_id: int,
    titulo: str,
    chapters: list[ChapterSource],
    autores: str = "",
) -> GeneratedEpub:
    ordered = sorted(chapters, key=lambda chapter: (chapter.ordem, chapter.id))
    if not ordered:
        raise ValueError("A written book needs at least one chapter")

    total_palavras = sum(count_words(chapter.conteudo) for chapter in ordered)
    identifier = book_identifier(book_id)
    modified = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr(
            zipfile.ZipInfo("mimetype"), MIME_TYPE.encode(), compress_type=zipfile.ZIP_STORED
        )
        archive.writestr("META-INF/container.xml", CONTAINER, compress_type=zipfile.ZIP_DEFLATED)
        archive.writestr("OEBPS/styles.css", STYLES, compress_type=zipfile.ZIP_DEFLATED)

        manifest = [
            '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" '
            'properties="nav" />',
            '<item id="styles" href="styles.css" media-type="text/css" />',
        ]
        spine = []
        toc = []
        for chapter in ordered:
            chapter_id = f"chapter-{chapter.id}"
            href = f"{chapter_id}.xhtml"
            safe_title = escape_xml(chapter.titulo)
            manifest.append(
                f'<item id="{chapter_id}" href="{href}" media-type="application/xhtml+xml" />'
            )
            spine.append(f'<itemref idref="{chapter_id}" />')
            toc.append(f'<li><a href="{href}">{safe_title}</a></li>')

            xhtml = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="pt-BR" lang="pt-BR">
  <head>
    <title>{safe_title}</title>
    <link rel="stylesheet" type="text/css" href="styles.css" />
  </head>
  <body>
    <h1>{safe_title}</h1>
    {build_paragraphs(chapter.conteudo)}
  </body>
</html>
"""
            archive.writestr(
                f"OEBPS/{href}", xhtml.encode("utf-8"), compress_type=zipfile.ZIP_DEFLATED
            )

        nav = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="pt-BR" lang="pt-BR">
  <head><title>Table of contents</title></head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Table of contents</h1>
      <ol>{''.join(toc)}</ol>
    </nav>
  </body>
</html>
"""
        package = f"""<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"
         xml:lang="pt-BR">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">{identifier}</dc:identifier>
    <dc:title>{escape_xml(titulo)}</dc:title>
    <dc:language>pt-BR</dc:language>
    <dc:creator>{escape_xml(autores)}</dc:creator>
    <meta property="dcterms:modified">{modified}</meta>
  </metadata>
  <manifest>{''.join(manifest)}</manifest>
  <spine>{''.join(spine)}</spine>
</package>
"""
        archive.writestr(
            "OEBPS/nav.xhtml", nav.encode("utf-8"), compress_type=zipfile.ZIP_DEFLATED
        )
        archive.writestr(
            "OEBPS/content.opf", package.encode("utf-8"), compress_type=zipfile.ZIP_DEFLATED
        )

    return GeneratedEpub(
        total_palavras=total_palavras,
        total_paginas=estimate_pages(total_palavras),
        identificador=identifier,
    )
