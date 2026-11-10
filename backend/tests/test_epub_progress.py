import zipfile
from pathlib import Path

from app.epub_progress import epub_progress_positions


def make_epub(path: Path, chapter_texts: list[str]) -> None:
    container = """<?xml version="1.0"?>
    <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="EPUB/book.opf" /></rootfiles>
    </container>"""
    manifest = "".join(
        f'<item id="chapter-{index}" href="chapter-{index}.xhtml" '
        'media-type="application/xhtml+xml" />'
        for index in range(len(chapter_texts))
    )
    spine = "".join(
        f'<itemref idref="chapter-{index}" />' for index in range(len(chapter_texts))
    )
    package = f"""<package xmlns="http://www.idpf.org/2007/opf">
      <manifest>{manifest}</manifest><spine>{spine}</spine>
    </package>"""

    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("META-INF/container.xml", container)
        archive.writestr("EPUB/book.opf", package)
        for index, text in enumerate(chapter_texts):
            archive.writestr(
                f"EPUB/chapter-{index}.xhtml",
                f"<html xmlns=\"http://www.w3.org/1999/xhtml\"><body><p>{text}</p></body></html>",
            )


def test_epub_positions_follow_spine_text_and_break_size(tmp_path):
    path = tmp_path / "book.epub"
    make_epub(path, ["a" * 1600, "b" * 1601])

    assert epub_progress_positions(path) == 3


def test_epub_positions_are_never_zero(tmp_path):
    path = tmp_path / "empty.epub"
    make_epub(path, [""])

    assert epub_progress_positions(path) == 1
