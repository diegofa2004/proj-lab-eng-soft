"""Opt-in fixtures for local frontend development."""

import argparse
import shutil
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
                descricao="Um guia de duas páginas para testar o leitor.",
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
        shutil.copyfile(
            Path(__file__).parent / "demo/leituras.pdf", CONTENT / f"{row.id_livro}.pdf"
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
