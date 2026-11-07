"""Regression checks for the backend/database audit on a dedicated PostgreSQL database."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db.base import AcessoLivro, MovimentoPontos, User
from app.db.session import SessionLocal
from app.main import app
from app.seed import seed


def account(client, *, admin=False):
    name = f"audit-{uuid4().hex}"
    response = client.post(
        "/register",
        json={"username": name, "email": f"{name}@example.com", "password": "password123"},
    )
    assert response.status_code == 201, response.text
    user_id = response.json()["id"]
    if admin:
        with SessionLocal.begin() as db:
            db.get(User, user_id).is_admin = True
    token = client.post("/login", json={"username": name, "password": "password123"})
    assert token.status_code == 200, token.text
    return user_id, {"Authorization": f"Bearer {token.json()['access_token']}"}, name


def test_validation_progress_and_admin_rules():
    seed()
    client = TestClient(app)
    book_id = client.get("/v2/books", params={"q": "Primeiros passos"}).json()[0]["id_livro"]
    user_id, headers, name = account(client)
    admin_id, admin_headers, _ = account(client, admin=True)

    for path in ("/users/me/notes", "/v2/me/notes"):
        response = client.post(path, headers=headers, json={"id_livro": book_id, "texto": "   "})
        assert response.status_code == 422, (path, response.text)
    note = client.post(
        "/v2/me/notes", headers=headers, json={"id_livro": book_id, "texto": "ok"}
    ).json()
    for path in (f"/notes/{note['id_nota']}", f"/v2/me/notes/{note['id_nota']}"):
        assert client.patch(path, headers=headers, json={"texto": None}).status_code == 422
    author_id = client.get("/v2/authors").json()[0]["id_autor"]
    assert (
        client.patch(
            f"/v2/admin/authors/{author_id}", headers=admin_headers, json={"nome": None}
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"/books/{book_id}/reviews",
            headers=headers,
            json={"id_livro": book_id, "nota": 5, "texto_revisao": "  "},
        ).status_code
        == 422
    )
    assert (
        client.put(
            f"/v2/books/{book_id}/review",
            headers=headers,
            json={"nota": 5, "texto_revisao": "  "},
        ).status_code
        == 422
    )

    before = client.get("/v2/me/points", headers=headers).json()
    assert client.get(f"/books/{book_id}/read", headers=headers).status_code == 200
    with SessionLocal() as db:
        assert (
            db.scalar(
                select(func.count())
                .select_from(AcessoLivro)
                .where(AcessoLivro.id_usuario == user_id)
            )
            == 0
        )
    assert (
        client.put(
            f"/v2/me/progress/{book_id}", headers=headers, json={"paginas_distintas_lidas": 2}
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/books/{book_id}/progress", headers=headers, json={"paginas_distintas_lidas": None}
        ).status_code
        == 422
    )
    assert (
        client.patch(
            f"/books/{book_id}/progress",
            headers=headers,
            json={"concluido_em": datetime.now(UTC).isoformat()},
        ).status_code
        == 422
    )
    assert client.get(f"/v2/books/{book_id}/content", headers=headers).status_code == 200
    assert (
        client.put(
            f"/v2/me/progress/{book_id}", headers=headers, json={"paginas_distintas_lidas": 2}
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/books/{book_id}/progress", headers=headers, json={"concluido_em": None}
        ).status_code
        == 422
    )
    assert len(client.get("/v2/me/points", headers=headers).json()) == len(before) + 1
    assert (
        client.patch(
            f"/admin/books/{book_id}", headers=admin_headers, json={"total_paginas": 1}
        ).status_code
        == 422
    )
    assert (
        client.put(
            f"/v2/books/{book_id}",
            headers=admin_headers,
            json={
                "titulo": "Primeiros passos no LivrUSP",
                "data_publicacao": "2026-01-01",
                "total_paginas": 1,
                "status_publicacao": "publicado",
            },
        ).status_code
        == 422
    )
    assert (
        client.patch(
            f"/admin/books/{book_id}", headers=admin_headers, json={"total_paginas": 2147483648}
        ).status_code
        == 422
    )
    assert (
        client.patch(
            f"/admin/books/{book_id}", headers=admin_headers, json={"titulo": None}
        ).status_code
        == 422
    )
    assert client.post(f"/admin/users/{admin_id}/block", headers=admin_headers).status_code == 403
    assert client.post("/users/me/inactivity?days=100", headers=headers).status_code == 422

    with SessionLocal.begin() as db:
        db.get(User, user_id).last_activity = datetime.now(UTC) - timedelta(days=3)
    login = client.post("/login", json={"username": name, "password": "password123"})
    assert login.status_code == 200
    with SessionLocal() as db:
        penalty = db.scalar(
            select(MovimentoPontos).where(
                MovimentoPontos.id_usuario == user_id, MovimentoPontos.motivo == "inatividade"
            )
        )
        assert penalty.quantidade == -2


def test_draft_upload_and_sorting():
    seed()
    client = TestClient(app)
    seed_book_id = client.get("/v2/books", params={"q": "Primeiros passos"}).json()[0]["id_livro"]
    user_id, headers, _ = account(client, admin=True)
    prefix = f"audit-sort-{uuid4().hex}"
    base = {"data_publicacao": "2026-11-01", "total_paginas": 2}
    invalid = dict(base, titulo=f"{prefix}-invalid", origem="catalogo")
    assert client.post("/books", headers=headers, json=invalid).status_code == 422
    assert (
        client.post(
            "/books", headers=headers, json=dict(base, titulo="draft", id_publicador=user_id + 1)
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/books",
            headers=headers,
            json=dict(base, titulo="draft", arquivo_conteudo="/missing.epub"),
        ).status_code
        == 422
    )
    draft = client.post("/books", headers=headers, json=dict(base, titulo="draft"))
    assert draft.status_code == 201 and draft.json()["status_publicacao"] == "rascunho"
    draft_id = draft.json()["id_livro"]
    assert (
        client.patch(
            f"/admin/books/{draft_id}", headers=headers, json={"status_publicacao": "publicado"}
        ).status_code
        == 409
    )
    bad_epub = client.put(
        f"/v2/books/{draft_id}/content",
        headers=headers,
        files={"file": ("bad.epub", b"not an epub", "application/epub+zip")},
    )
    assert bad_epub.status_code == 422, bad_epub.text

    epub = client.get(f"/v2/books/{seed_book_id}/content").content
    wrong_pages = client.post(
        "/v2/books",
        headers=headers,
        json={
            "titulo": f"{prefix}-wrong-pages",
            "data_publicacao": "2026-11-01",
            "total_paginas": 3,
        },
    ).json()["id_livro"]
    assert (
        client.put(
            f"/v2/books/{wrong_pages}/content",
            headers=headers,
            files={"file": ("valid.epub", epub, "application/epub+zip")},
        ).status_code
        == 204
    )
    books = []
    for suffix in ("A", "B"):
        response = client.post(
            "/v2/books", headers=headers, json=dict(base, titulo=f"{prefix}-{suffix}")
        )
        assert response.status_code == 201, response.text
        book_id = response.json()["id_livro"]
        assert (
            client.put(
                f"/v2/books/{book_id}/content",
                headers=headers,
                files={"file": ("valid.epub", epub, "application/epub+zip")},
            ).status_code
            == 204
        )
        assert (
            client.put(
                f"/v2/books/{book_id}",
                headers=headers,
                json=dict(base, titulo=f"{prefix}-{suffix}", status_publicacao="publicado"),
            ).status_code
            == 200
        )
        books.append(book_id)
    for book_id, score in zip(books, (5, 1)):
        assert (
            client.put(
                f"/v2/books/{book_id}/review", headers=headers, json={"nota": score}
            ).status_code
            == 200
        )
    for _ in range(2):
        assert client.get(f"/v2/books/{books[1]}/content", headers=headers).status_code == 200
    rating = client.get("/books", params={"title": prefix, "sort": "rating"}).json()
    popularity = client.get("/books", params={"title": prefix, "sort": "popularity"}).json()
    assert [item["id_livro"] for item in rating] == books
    assert [item["id_livro"] for item in popularity] == list(reversed(books))
