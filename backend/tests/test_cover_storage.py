from types import SimpleNamespace

from fastapi.responses import Response

from app.api.endpoints.catalog import cover


class CoverDatabase:
    def __init__(self):
        self.book = SimpleNamespace(status_bloqueado=False, status_publicacao="publicado")
        self.cover = SimpleNamespace(imagem=b"cover-bytes", tipo_mime="image/jpeg")
        self.calls = 0

    def get(self, _model, _id):
        self.calls += 1
        return self.book if self.calls == 1 else self.cover


def test_cover_prefers_image_bytes_stored_in_database():
    response = cover(1, CoverDatabase())

    assert isinstance(response, Response)
    assert response.body == b"cover-bytes"
    assert response.media_type == "image/jpeg"
    assert response.headers["cache-control"] == "public, max-age=604800, immutable"
