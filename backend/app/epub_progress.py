"""Stable reading-position counts for reflowable EPUB documents."""

import posixpath
import zipfile
from math import ceil
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree

LOCATION_BREAK_SIZE = 1600


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _safe_archive_path(base: str, href: str) -> str:
    href = unquote(href.split("#", 1)[0].split("?", 1)[0])
    path = posixpath.normpath(posixpath.join(posixpath.dirname(base), href))
    if path.startswith("../") or path.startswith("/") or path == "..":
        raise ValueError("EPUB manifest contains an unsafe path")
    return path


def _readable_text_length(document: bytes) -> int:
    try:
        root = ElementTree.fromstring(document)
    except ElementTree.ParseError:
        return 0

    parts: list[str] = []

    def collect(node: ElementTree.Element) -> None:
        if _local_name(node.tag).lower() in {"head", "script", "style", "svg"}:
            return
        if node.text:
            parts.append(node.text)
        for child in node:
            collect(child)
            if child.tail:
                parts.append(child.tail)

    collect(root)
    return len(" ".join("".join(parts).split()))


def epub_progress_positions(path: Path, break_size: int = LOCATION_BREAK_SIZE) -> int:
    """Return an approximate EPUB.js location count, never a physical page count."""
    if break_size <= 0:
        raise ValueError("break_size must be positive")

    try:
        with zipfile.ZipFile(path) as archive:
            container = ElementTree.fromstring(archive.read("META-INF/container.xml"))
            rootfile = next(
                (
                    element.attrib.get("full-path")
                    for element in container.iter()
                    if _local_name(element.tag) == "rootfile"
                    and element.attrib.get("full-path")
                ),
                None,
            )
            if not rootfile:
                raise ValueError("EPUB container does not reference a package document")

            package = ElementTree.fromstring(archive.read(rootfile))
            manifest: dict[str, str] = {}
            for element in package.iter():
                if _local_name(element.tag) != "item":
                    continue
                item_id = element.attrib.get("id")
                href = element.attrib.get("href")
                media_type = element.attrib.get("media-type", "")
                if item_id and href and media_type in {"application/xhtml+xml", "text/html"}:
                    manifest[item_id] = _safe_archive_path(rootfile, href)

            spine_ids = [
                element.attrib["idref"]
                for element in package.iter()
                if _local_name(element.tag) == "itemref" and element.attrib.get("idref")
            ]
            text_length = 0
            for item_id in spine_ids:
                document_path = manifest.get(item_id)
                if document_path:
                    text_length += _readable_text_length(archive.read(document_path))
    except (ElementTree.ParseError, KeyError, OSError, zipfile.BadZipFile) as exc:
        raise ValueError("Unable to calculate EPUB reading positions") from exc

    return max(1, ceil(text_length / break_size))
