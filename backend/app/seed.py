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

DEMO_TITLE = "Primeiros passos no LivrUSP"
DEMO_CHAPTERS = (
    (
        "chapter-1",
        "Abrindo o livro",
        (
            "Este é o livro de demonstração do LivrUSP.",
            "Use os controles do leitor para navegar entre os capítulos e acompanhar o progresso.",
        ),
    ),
    (
        "chapter-2",
        "Conhecendo o catálogo",
        (
            "O catálogo reúne livros publicados e permite buscar por título, autor e gênero.",
            "Você também pode ordenar os resultados por popularidade, avaliação e data.",
        ),
    ),
    (
        "chapter-3",
        "Sua estante",
        (
            "Favoritos, livros para ler depois e leituras em andamento ficam em "
            "estantes separadas.",
            "Ao começar a ler, o livro deixa a lista de leitura futura.",
        ),
    ),
    (
        "chapter-4",
        "Acompanhando o progresso",
        (
            "O leitor salva a última posição e mostra quanto da obra já foi percorrido.",
            "Os livros concluídos alimentam o dashboard de leitura.",
        ),
    ),
    (
        "chapter-5",
        "Próximos passos",
        (
            "Explore o catálogo, avalie os livros que terminou e compartilhe suas descobertas.",
            "Este capítulo encerra o livro de demonstração.",
        ),
    ),
)
DEMO_PAGES = len(DEMO_CHAPTERS)


def write_demo_epub(path: Path) -> None:
    """Create a valid multi-chapter EPUB3 fixture without storing a binary in Git."""
    manifest_items = [
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
    ]
    spine_items: list[str] = []
    toc_items: list[str] = []
    for chapter_id, title, _ in DEMO_CHAPTERS:
        manifest_items.append(
            f'<item id="{chapter_id}" href="{chapter_id}.xhtml" '
            'media-type="application/xhtml+xml"/>'
        )
        spine_items.append(f'<itemref idref="{chapter_id}"/>')
        toc_items.append(f'<li><a href="{chapter_id}.xhtml">{title}</a></li>')

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
            f"<dc:title>{DEMO_TITLE}</dc:title><dc:language>pt-BR</dc:language>"
            '<meta property="dcterms:modified">2026-01-01T00:00:00Z</meta>'
            "</metadata><manifest>"
            + "".join(manifest_items)
            + "</manifest><spine>"
            + "".join(spine_items)
            + "</spine></package>",
        )
        archive.writestr(
            "OEBPS/nav.xhtml",
            "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
            '<html xmlns="http://www.w3.org/1999/xhtml" '
            'xmlns:epub="http://www.idpf.org/2007/ops">'
            "<head><title>Contents</title></head><body>"
            '<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>'
            + "".join(toc_items)
            + "</ol></nav></body></html>",
        )
        for chapter_id, title, paragraphs in DEMO_CHAPTERS:
            body = "".join(f"<p>{paragraph}</p>" for paragraph in paragraphs)
            archive.writestr(
                f"OEBPS/{chapter_id}.xhtml",
                "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
                '<html xmlns="http://www.w3.org/1999/xhtml">'
                f"<head><title>{title}</title></head><body>"
                f"<h1>{title}</h1>{body}</body></html>",
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
        description = f"Um guia de {DEMO_PAGES} capítulos para testar o leitor."
        row = get_or_create(
            Livro,
            dict(
                descricao=description,
                data_publicacao=date(2026, 1, 1),
                arquivo_conteudo="pending",
                total_paginas=DEMO_PAGES,
                origem="catalogo",
                status_publicacao="publicado",
            ),
            titulo=DEMO_TITLE,
            id_publicador=None,
        )
        get_or_create(LivroAutor, id_livro=row.id_livro, id_autor=author.id_autor)
        get_or_create(LivroGenero, id_livro=row.id_livro, id_genero=genre.id_genero)
        row.descricao = description
        row.total_paginas = DEMO_PAGES
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
