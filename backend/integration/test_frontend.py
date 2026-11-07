"""Run explicitly against a dedicated migrated PostgreSQL database with DEMO_BILLING=true."""

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import settings
from app.db.base import User
from app.db.session import SessionLocal
from app.main import app
from app.seed import seed


def test_frontend_journey():
    assert settings.DEMO_BILLING, "Use a dedicated test database and enable demo billing"
    seed()
    seed()
    client = TestClient(app, base_url="http://testserver/v2/")

    def api(method, path, expected=200, token=None, **kwargs):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        r = client.request(method, path, headers=headers, **kwargs)
        assert r.status_code == expected, (method, path, r.status_code, r.text[:500])
        return r.json() if r.content and "json" in r.headers.get("content-type", "") else r

    def account():
        name = "test-" + uuid4().hex
        payload = dict(username=name, password="password123")
        user = api("POST", "/register", 201, json=dict(**payload, email=f"{name}@example.com"))
        return user, api("POST", "/login", json=payload)["access_token"]

    reader, token = account()
    other, admin = account()
    with SessionLocal.begin() as db:
        db.scalar(select(User).filter_by(id=other["id"])).is_admin = True
    assert api("GET", "/me", token=admin)["is_admin"] is True
    found_users = api("GET", "/admin/users", token=admin, params={"q": reader["username"]})
    assert [item["id"] for item in found_users] == [reader["id"]]
    assert api("GET", f"/admin/users/{reader['id']}", token=admin)["email"] == reader["email"]
    api("GET", "/health")
    assert "email" not in api("GET", f"/profiles/{reader['id']}")
    api("GET", "/admin/plans", token=admin)
    catalog = api("GET", "/books", params={"q": "Primeiros passos"})
    book = catalog[0]["id_livro"]
    details = api("GET", f"/books/{book}")
    assert details["generos"] and details["autores"]
    epub = api("GET", f"/books/{book}/content").content
    assert epub.startswith(b"PK")
    assert api("GET", f"/books/{book}/content", token=token).content.startswith(b"PK")
    api("GET", "/admin/users", 403, token)
    api("GET", "/me/profile", 401)
    asset = api("GET", "/assets")[0]
    api(
        "PATCH",
        "/me/profile",
        token=token,
        json={"biografia": "leitora", "id_avatar": asset["id_asset"]},
    )
    for _ in range(2):
        api("PUT", f"/me/lists/favorito/{book}", token=token)
    assert len(api("GET", "/me/lists", token=token)) == 1
    note = api("POST", "/me/notes", 201, token, json={"id_livro": book, "texto": "private"})
    api("PATCH", f"/me/notes/{note['id_nota']}", 404, admin, json={"texto": "forbidden"})
    assert not api("GET", "/me/notes", token=admin)
    api("PATCH", f"/me/notes/{note['id_nota']}", token=token, json={"texto": "revised"})
    api("DELETE", f"/me/notes/{note['id_nota']}", 204, token)
    review = api("PUT", f"/books/{book}/review", token=token, json={"nota": 4})
    api("GET", f"/books/{book}/reviews")
    assert api("GET", f"/admin/users/{reader['id']}/reviews", token=admin)[0]["id_avaliacao"] == review["id_avaliacao"]
    assert any(item["id_avaliacao"] == review["id_avaliacao"] for item in api("GET", "/admin/reviews/feed", token=admin))
    api("PUT", f"/me/progress/{book}", 422, token, json={"paginas_distintas_lidas": 3})
    for _ in range(2):
        api("PUT", f"/me/progress/{book}", token=token, json={"paginas_distintas_lidas": 2})
    assert len(api("GET", "/me/points", token=token)) == 1
    assert api("GET", "/me/dashboard", token=token)["livros_concluidos"] == 1
    session = api("POST", f"/me/sessions/{book}", 201, token)
    api(
        "PUT",
        f"/me/sessions/{session['id_sessao']}/end",
        token=token,
        json={"tempo_ativo_segundos": 0},
    )
    payload = dict(
        titulo="Test draft",
        data_publicacao="2026-11-01",
        total_paginas=2,
        generos=[details["generos"][0]["id_genero"]],
    )
    api("POST", "/books", 403, token, json=payload)
    plan = api("GET", "/plans")[0]["id_plano"]
    purchase = api("POST", "/me/checkout", token=token, json={"id_plano": plan})
    assert purchase == api("POST", "/me/checkout", token=token, json={"id_plano": plan})
    assert api("GET", "/me/profile", token=token)["is_premium"]
    draft = api("POST", "/books", 201, token, json=payload)["id_livro"]
    api("GET", f"/books/{draft}", 404)
    api("PUT", f"/books/{draft}", 409, token, json=dict(payload, status_publicacao="publicado"))
    epub = api("GET", f"/books/{book}/content").content
    api(
        "PUT",
        f"/books/{draft}/content",
        204,
        token,
        files={"file": ("book.epub", epub, "application/epub+zip")},
    )
    api("PUT", f"/books/{draft}", token=token, json=dict(payload, status_publicacao="publicado"))
    api("GET", f"/books/{draft}")
    api(
        "POST",
        "/admin/actions",
        201,
        admin,
        json=dict(tipo_acao="bloquear_livro", id_livro_alvo=draft, descricao="test"),
    )
    api("GET", f"/books/{draft}", 404)
    api(
        "POST",
        "/admin/actions",
        201,
        admin,
        json=dict(
            tipo_acao="moderar_avaliacao",
            id_avaliacao_alvo=review["id_avaliacao"],
            descricao="test",
        ),
    )
    sub = purchase["subscription"]["id_assinatura"]
    api("DELETE", f"/me/subscriptions/{sub}", 404, admin)
    api("DELETE", f"/me/subscriptions/{sub}", token=token)
    assert not api("GET", "/me/profile", token=token)["is_premium"]
    api("GET", "/me/payments", token=token)
    api(
        "POST",
        "/admin/actions",
        201,
        admin,
        json=dict(tipo_acao="bloquear_usuario", id_usuario_alvo=reader["id"], descricao="test"),
    )
    api("GET", "/me", 403, token)
    api("POST", "/login", 403, json={"username": reader["username"], "password": "password123"})
    api("GET", "/admin/dashboard", token=admin)
    assert api("GET", "/admin/actions", token=admin)


def test_legacy_billing_and_publication(monkeypatch):
    seed()
    c = TestClient(app)
    name = "legacy-" + uuid4().hex
    creds = {"username": name, "password": "password123"}
    assert c.post("/register", json=dict(creds, email=f"{name}@example.com")).status_code == 201
    token = c.post("/login", json=creds).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    plan_id = c.get("/v2/plans").json()[0]["id_plano"]
    monkeypatch.setattr(settings, "DEMO_BILLING", False)
    assert c.post("/users/me/subscription", headers=headers).status_code == 503
    assert c.post("/v2/me/checkout", json={"id_plano": plan_id}, headers=headers).status_code == 503
    assert not c.get("/v2/me/profile", headers=headers).json()["is_premium"]
    assert c.get("/premium/discover", headers=headers).status_code == 403
    monkeypatch.setattr(settings, "DEMO_BILLING", True)
    for _ in range(2):
        assert c.post("/users/me/subscription", headers=headers).status_code == 200
    assert len(c.get("/v2/me/payments", headers=headers).json()) == 1
    assert c.get("/premium/discover", headers=headers).status_code == 200
    assert c.get("/users/me/suggestions", headers=headers).status_code == 200
    assert c.get("/content/user-created").status_code == 200
    assert c.get("/demo/avatar.svg").status_code == 200
    item = c.get("/v2/books", params={"q":"Primeiros passos"}).json()[0]
    assert item["arquivo_conteudo"].startswith("/v2/books/")
    for path in [item["arquivo_conteudo"], item["arquivo_conteudo"].removeprefix("/v2")]:
        assert c.get(path).content.startswith(b"PK")
