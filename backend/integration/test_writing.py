"""Run explicitly against a migrated PostgreSQL database with DEMO_BILLING=true."""

import os
import zipfile
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.main import app
from app.seed import seed


def test_writing_chapter_journey():
    assert os.getenv("RUN_WRITING_INTEGRATION_TESTS") == "1", (
        "Set RUN_WRITING_INTEGRATION_TESTS=1 to allow database-writing integration tests"
    )
    assert settings.DEMO_BILLING, "Use a dedicated test database and enable demo billing"
    database_name = make_url(settings.DATABASE_URL).database or ""
    assert "test" in database_name.lower(), (
        "Refusing to write integration data: DATABASE_URL must point to a database "
        "whose name contains 'test'"
    )
    seed()
    client = TestClient(app, base_url="http://testserver/v2/")

    def api(method, path, expected=200, token=None, **kwargs):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        response = client.request(method, path, headers=headers, **kwargs)
        assert response.status_code == expected, (
            method,
            path,
            response.status_code,
            response.text[:500],
        )
        is_json = response.content and "json" in response.headers.get("content-type", "")
        return response.json() if is_json else response

    def account():
        name = "writer-" + uuid4().hex
        payload = dict(username=name, password="password123")
        user = api("POST", "/register", 201, json=dict(**payload, email=f"{name}@example.com"))
        token = api("POST", "/login", json=payload)["access_token"]
        return user, token

    def subscribe(token):
        plan = api("GET", "/plans")[0]["id_plano"]
        api("POST", "/me/checkout", token=token, json={"id_plano": plan})

    writer, token = account()
    other, other_token = account()

    api("POST", "/books/1/chapters", 403, token, json={"titulo": "Forbidden"})
    subscribe(token)
    subscribe(other_token)

    payload = dict(
        titulo="Written draft",
        data_publicacao="2026-11-01",
        total_paginas=1,
    )
    book_id = api("POST", "/books", 201, token, json=payload)["id_livro"]
    (Path("content") / f"{book_id}.epub").unlink(missing_ok=True)

    first = api(
        "POST",
        f"/books/{book_id}/chapters",
        201,
        token,
        json={"titulo": "One", "conteudo": "alpha beta"},
    )
    second = api(
        "POST",
        f"/books/{book_id}/chapters",
        201,
        token,
        json={"titulo": "Two", "conteudo": "gamma"},
    )
    assert (first["ordem"], second["ordem"]) == (1, 2)

    detail = api("GET", f"/me/books/{book_id}", token=token)
    assert detail["total_capitulos"] == 2
    assert detail["total_palavras"] == 3
    assert detail["tem_epub"] is False
    assert [chapter["id_capitulo"] for chapter in detail["capitulos"]] == [
        first["id_capitulo"],
        second["id_capitulo"],
    ]

    saved = api(
        "PATCH",
        f"/books/{book_id}/chapters/{first['id_capitulo']}",
        token=token,
        json={"versao": 1, "conteudo": "alpha beta revised"},
    )
    assert saved["versao"] == 2
    api(
        "PATCH",
        f"/books/{book_id}/chapters/{first['id_capitulo']}",
        409,
        token,
        json={"versao": 1, "conteudo": "stale"},
    )

    reordered = api(
        "PUT",
        f"/books/{book_id}/chapters/reorder",
        token=token,
        json={"capitulos": [second["id_capitulo"], first["id_capitulo"]]},
    )
    assert [chapter["id_capitulo"] for chapter in reordered] == [
        second["id_capitulo"],
        first["id_capitulo"],
    ]
    assert [chapter["ordem"] for chapter in reordered] == [1, 2]

    api(
        "PUT",
        f"/books/{book_id}/chapters/reorder",
        422,
        token,
        json={"capitulos": [first["id_capitulo"]]},
    )
    api("DELETE", f"/books/{book_id}/chapters/{second['id_capitulo']}", 204, token)
    remaining = api("GET", f"/me/books/{book_id}", token=token)["capitulos"]
    assert [(chapter["id_capitulo"], chapter["ordem"]) for chapter in remaining] == [
        (first["id_capitulo"], 1)
    ]

    api("GET", f"/me/books/{book_id}", 404, other_token)
    api(
        "POST",
        f"/books/{book_id}/chapters",
        404,
        other_token,
        json={"titulo": "Stolen"},
    )

    preview = api("POST", f"/books/{book_id}/epub", token=token)
    assert preview == {"total_palavras": 3, "total_paginas": 1}
    api(
        "PUT",
        f"/books/{book_id}/content",
        409,
        token,
        files={"file": ("draft.epub", b"PK", "application/epub+zip")},
    )

    published = api(
        "PUT",
        f"/books/{book_id}",
        token=token,
        json=dict(payload, titulo="Published title", status_publicacao="publicado"),
    )
    assert published["total_paginas"] == 1
    epub = api("GET", f"/books/{book_id}/content", token=token).content
    assert epub.startswith(b"PK")
    with zipfile.ZipFile(BytesIO(epub)) as archive:
        assert b"Published title" in archive.read("OEBPS/content.opf")

    published_detail = api("GET", f"/me/books/{book_id}", token=token)
    assert [author["nome"] for author in published_detail["autores"]] == [writer["username"]]

    api(
        "PATCH",
        f"/books/{book_id}/chapters/{first['id_capitulo']}",
        409,
        token,
        json={"versao": 2, "conteudo": "published"},
    )
