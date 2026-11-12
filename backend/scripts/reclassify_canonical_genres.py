"""Rebuild automatic canonical genre links from the current database rules."""

from app.canonical_genres import reclassify_all_books
from app.db.session import SessionLocal


def main() -> None:
    with SessionLocal.begin() as db:
        total, classified = reclassify_all_books(db)
    print(f"Reclassified {total} books; {classified} matched at least one canonical genre.")


if __name__ == "__main__":
    main()
