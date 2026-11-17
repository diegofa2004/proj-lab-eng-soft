"""Copy existing local cover files into the shared PostgreSQL database.

The command is resumable: only rows whose ``imagem`` field is empty are
updated. It is intended to run from the backend container, where the existing
``/app/content/covers`` volume is mounted, with
``python -m scripts.store_local_covers_in_db``.
"""

from pathlib import Path

from sqlalchemy import select

from app.api.endpoints.catalog import CONTENT
from app.db.base import CapaLivro
from app.db.session import SessionLocal


def main() -> None:
    updated = missing = 0
    with SessionLocal.begin() as db:
        covers = db.scalars(
            select(CapaLivro).where(CapaLivro.imagem.is_(None)).order_by(CapaLivro.id_livro)
        ).all()
        for cover in covers:
            path = Path(CONTENT) / "covers" / f"{cover.id_livro}.jpg"
            if not path.is_file():
                missing += 1
                print(f"book #{cover.id_livro}: local cover not found")
                continue
            cover.imagem = path.read_bytes()
            updated += 1
    print(f"Done: {updated} cover images stored in the database; {missing} local files missing.")


if __name__ == "__main__":
    main()
