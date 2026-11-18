import zipfile
from pathlib import Path
from xml.etree import ElementTree

import pytest

from app.api.endpoints.catalog import validate_epub
from app.services.epub import (
    ChapterSource,
    book_identifier,
    estimate_pages,
    generate_epub,
)


def chapter(chapter_id: int, order: int, title: str, text: str) -> ChapterSource:
    return ChapterSource(id=chapter_id, ordem=order, titulo=title, conteudo=text)


def test_estimate_pages_uses_words_per_page_with_a_minimum():
    assert estimate_pages(0) == 1
    assert estimate_pages(300) == 1
    assert estimate_pages(301) == 2
    assert estimate_pages(900) == 3


def test_identifier_is_stable_for_a_book():
    assert book_identifier(7) == book_identifier(7)
    assert book_identifier(7) != book_identifier(8)


def test_generated_epub_has_valid_structure_order_and_escaped_text(tmp_path: Path):
    path = tmp_path / "draft.epub"
    result = generate_epub(
        path,
        42,
        "A & B",
        [
            chapter(9, 2, "Second <chapter>", "Second & final"),
            chapter(3, 1, "First", "One <two>\n\nThree & four"),
        ],
        "Author <name>",
    )

    validate_epub(path)
    assert (result.total_palavras, result.total_paginas) == (8, 1)

    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        assert names[0] == "mimetype"
        assert archive.getinfo("mimetype").compress_type == zipfile.ZIP_STORED
        assert "META-INF/container.xml" in names
        assert "OEBPS/content.opf" in names
        assert "OEBPS/nav.xhtml" in names
        assert "OEBPS/styles.css" in names

        package = ElementTree.fromstring(archive.read("OEBPS/content.opf"))
        spine = [node.attrib["idref"] for node in package.iter() if node.tag.endswith("itemref")]
        assert spine == ["chapter-3", "chapter-9"]

        first = archive.read("OEBPS/chapter-3.xhtml").decode()
        assert "<h1>First</h1>" in first
        assert "<p>One &lt;two&gt;</p>" in first
        assert "<p>Three &amp; four</p>" in first
        assert "&lt;chapter&gt;" in archive.read("OEBPS/nav.xhtml").decode()


def test_generate_epub_requires_at_least_one_chapter(tmp_path: Path):
    with pytest.raises(ValueError, match="at least one chapter"):
        generate_epub(tmp_path / "empty.epub", 1, "Empty", [])
