"""Opt-in fixtures for local frontend development."""

import argparse
import zipfile
from datetime import date
from pathlib import Path

from sqlalchemy import select

from app.api.endpoints.catalog import CONTENT
from app.db.base import (
    AssetPerfil,
    Autor,
    Genero,
    Livro,
    LivroAutor,
    LivroGenero,
    Nivel,
    Plano,
    User,
)
from app.db.session import SessionLocal


def write_demo_epub(path: Path) -> None:
    """Create a minimal valid EPUB3 fixture without storing a binary in Git."""
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        archive.writestr(
            "META-INF/container.xml",
            "<?xml version=\"1.0\"?>"
            "<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">"
            "<rootfiles><rootfile full-path=\"OEBPS/content.opf\" "
            "media-type=\"application/oebps-package+xml\"/></rootfiles></container>",
        )
        archive.writestr(
            "OEBPS/content.opf",
            "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
            "<package version=\"3.0\" xmlns=\"http://www.idpf.org/2007/opf\" "
            "unique-identifier=\"book-id\"><metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">"
            "<dc:identifier id=\"book-id\">livrusp-demo</dc:identifier>"
            "<dc:title>Primeiros passos no LivrUSP</dc:title><dc:language>pt-BR</dc:language>"
            "</metadata><manifest><item id=\"chapter\" href=\"chapter.xhtml\" "
            "media-type=\"application/xhtml+xml\"/></manifest><spine>"
            "<itemref idref=\"chapter\"/></spine></package>",
        )
        archive.writestr(
            "OEBPS/chapter.xhtml",
            "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
            "<html xmlns=\"http://www.w3.org/1999/xhtml\"><head><title>Primeiros passos</title>"
            "</head><body><h1>Primeiros passos no LivrUSP</h1><p>Livro de exemplo.</p>"
            "</body></html>",
        )


def seed():
    with SessionLocal.begin() as db:

        def get_or_create(model, defaults=None, **keys):
            row = db.scalar(select(model).filter_by(**keys))
            if row is None:
                row = model(**keys, **(defaults or {}))
                db.add(row)
                db.flush()
            return row

        get_or_create(
            Plano, dict(preco=9.90, moeda="BRL", periodicidade="mensal"), nome="Premium demo"
        )
        get_or_create(Nivel, dict(permite_publicar=True, nome="Autor"), pontos_minimos=5)
        get_or_create(
            AssetPerfil, dict(arquivo="/v2/demo/avatar.svg"), tipo="avatar", nome="Leitor"
        )
        author = get_or_create(Autor, nome="Equipe LivrUSP")
        genre = get_or_create(Genero, nome="Introdução")
        row = get_or_create(
            Livro,
            dict(
                descricao="Um guia de duas posições de progresso para testar o leitor.",
                data_publicacao=date(2026, 1, 1),
                arquivo_conteudo="pending",
                total_paginas=2,
                origem="catalogo",
                status_publicacao="publicado",
            ),
            titulo="Primeiros passos no LivrUSP",
            id_publicador=None,
        )
        get_or_create(LivroAutor, id_livro=row.id_livro, id_autor=author.id_autor)
        get_or_create(LivroGenero, id_livro=row.id_livro, id_genero=genre.id_genero)
        row.arquivo_conteudo = f"/v2/books/{row.id_livro}/content"
        CONTENT.mkdir(exist_ok=True)
        write_demo_epub(CONTENT / f"{row.id_livro}.epub")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--grant-admin", metavar="USERNAME", help="Promote one registered local account"
    )
    args = parser.parse_args()
    if args.grant_admin:
        with SessionLocal.begin() as db:
            user = db.scalar(select(User).filter_by(username=args.grant_admin))
            if user is None:
                parser.error("Register that username first")
            user.is_admin = True
    else:
        seed()
