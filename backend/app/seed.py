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

DEMO_BOOKS = (
    {
        "title": "Primeiros passos no LivrUSP",
        "author": "Equipe LivrUSP",
        "genre": "Introdução",
        "description": "Um guia de 5 capítulos para testar o leitor.",
        "published_on": date(2026, 1, 1),
        "chapters": (
            (
                "chapter-1",
                "Abrindo o livro",
                (
                    "Este é o livro de demonstração do LivrUSP.",
                    "Use os controles do leitor para navegar entre os capítulos e acompanhar "
                    "o progresso.",
                ),
            ),
            (
                "chapter-2",
                "Conhecendo o catálogo",
                (
                    "O catálogo reúne livros publicados e permite buscar por título, autor "
                    "e gênero.",
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
                    "Explore o catálogo, avalie os livros que terminou e compartilhe suas "
                    "descobertas.",
                    "Este capítulo encerra o livro de demonstração.",
                ),
            ),
        ),
    },
    {
        "title": "Segundo livro de teste no LivrUSP",
        "author": "Autora de Teste",
        "genre": "Gênero de Teste",
        "description": "Livro de 4 capítulos para testar buscas por título, autora e gênero.",
        "published_on": date(2026, 2, 1),
        "chapters": (
            (
                "chapter-1",
                "Busca por título",
                (
                    "Este livro existe para testar a busca por título no catálogo.",
                    "Pesquise por 'Segundo livro de teste' e ele deve aparecer.",
                ),
            ),
            (
                "chapter-2",
                "Busca por autora",
                (
                    "Pesquise por 'Autora de Teste' para validar a busca por autor.",
                    "O resultado deve incluir este livro.",
                ),
            ),
            (
                "chapter-3",
                "Busca por gênero",
                (
                    "Filtre o catálogo por 'Gênero de Teste'.",
                    "Este livro deve ser o único resultado do filtro.",
                ),
            ),
            (
                "chapter-4",
                "Resultado esperado",
                (
                    "As buscas por título, autora e gênero devem retornar este mesmo livro.",
                    "Use este fixture para validar filtros e combinações no catálogo.",
                ),
            ),
        ),
    },
)


def write_epub(
    path: Path,
    *,
    title: str,
    chapters: tuple[tuple[str, str, tuple[str, ...]], ...],
) -> None:
    """Create a valid multi-chapter EPUB3 fixture without storing a binary in Git."""
    manifest_items = [
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
    ]
    spine_items: list[str] = []
    toc_items: list[str] = []
    for chapter_id, chapter_title, _ in chapters:
        manifest_items.append(
            f'<item id="{chapter_id}" href="{chapter_id}.xhtml" '
            'media-type="application/xhtml+xml"/>'
        )
        spine_items.append(f'<itemref idref="{chapter_id}"/>')
        toc_items.append(f'<li><a href="{chapter_id}.xhtml">{chapter_title}</a></li>')

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
            f"<dc:identifier id=\"book-id\">livrusp-{path.stem}</dc:identifier>"
            f"<dc:title>{title}</dc:title><dc:language>pt-BR</dc:language>"
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
        for chapter_id, chapter_title, paragraphs in chapters:
            body = "".join(f"<p>{paragraph}</p>" for paragraph in paragraphs)
            archive.writestr(
                f"OEBPS/{chapter_id}.xhtml",
                "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
                '<html xmlns="http://www.w3.org/1999/xhtml">'
                f"<head><title>{chapter_title}</title></head><body>"
                f"<h1>{chapter_title}</h1>{body}</body></html>",
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
        CONTENT.mkdir(exist_ok=True)

        for book in DEMO_BOOKS:
            author = get_or_create(Autor, nome=book["author"])
            genre = get_or_create(Genero, nome=book["genre"])
            row = get_or_create(
                Livro,
                dict(
                    descricao=book["description"],
                    data_publicacao=book["published_on"],
                    arquivo_conteudo="pending",
                    total_paginas=len(book["chapters"]),
                    origem="catalogo",
                    status_publicacao="publicado",
                ),
                titulo=book["title"],
                id_publicador=None,
            )
            get_or_create(LivroAutor, id_livro=row.id_livro, id_autor=author.id_autor)
            get_or_create(LivroGenero, id_livro=row.id_livro, id_genero=genre.id_genero)
            row.descricao = book["description"]
            row.total_paginas = len(book["chapters"])
            row.arquivo_conteudo = f"/v2/books/{row.id_livro}/content"
            write_epub(
                CONTENT / f"{row.id_livro}.epub",
                title=book["title"],
                chapters=book["chapters"],
            )


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
