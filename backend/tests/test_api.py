def register(client, username="reader", email="reader@example.com", password="password123"):
    return client.post(
        "/register",
        json={"username": username, "email": email, "password": password},
    )


def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_register_returns_public_user(client):
    response = register(client)

    assert response.status_code == 201
    assert response.json()["username"] == "reader"
    assert response.json()["email"] == "reader@example.com"
    assert response.json()["is_admin"] is False
    assert "password" not in response.json()
    assert "password_hash" not in response.json()


def test_register_rejects_duplicate_username(client):
    register(client)
    response = register(client, email="another@example.com")

    assert response.status_code == 409
    assert response.json()["detail"] == "Username is already registered."


def test_register_rejects_duplicate_email(client):
    register(client)
    response = register(client, username="another-reader")

    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered."


def test_login_accepts_valid_credentials(client):
    register(client)
    response = client.post("/login", json={"username": "reader", "password": "password123"})

    assert response.status_code == 200
    assert response.json()["access_token"]
    assert response.json()["token_type"] == "bearer"
    assert response.json()["user"]["username"] == "reader"
    assert response.json()["user"]["is_admin"] is False
    assert "password_hash" not in response.json()["user"]


def test_me_returns_the_authenticated_user(client):
    register(client)
    login = client.post("/login", json={"username": "reader", "password": "password123"})
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json()["username"] == "reader"


def test_me_rejects_a_missing_token(client):
    response = client.get("/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated."


def test_login_rejects_invalid_credentials(client):
    register(client)
    response = client.post("/login", json={"username": "reader", "password": "wrong-password"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."


def test_register_rejects_invalid_data(client):
    response = register(client, username="ab", email="not-an-email", password="short")

    assert response.status_code == 422


def test_password_limit_is_in_bytes(client):
    assert register(client, password="é" * 37).status_code == 422
    assert register(client, password="é" * 36).status_code == 201
    assert (
        client.post("/login", json={"username": "reader", "password": "é" * 37}).status_code == 422
    )


def test_expiration_claim_required(client):
    import jwt

    from app.core.config import settings

    user = register(client).json()
    token = jwt.encode(
        {"sub": str(user["id"]), "type": "access"},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    assert client.get("/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
