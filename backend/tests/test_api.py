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
