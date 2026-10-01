from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException


class MemoryStore:
    def __init__(self) -> None:
        self.books: dict[int, dict[str, Any]] = {
            1: {"id": 1, "title": "The Little Prince", "author": "Antoine de Saint-Exupery", "genre": "Fiction", "publication_date": date(1943, 4, 6), "description": "A poetic tale about friendship and the way we see the world.", "content": "Once upon a time, there was a little prince who lived on a planet only slightly larger than himself.", "pages": 96, "popularity": 980, "blocked": False, "publisher_id": None},
            2: {"id": 2, "title": "Twenty Thousand Leagues Under the Seas", "author": "Jules Verne", "genre": "Adventure", "publication_date": date(1870, 6, 20), "description": "An underwater adventure aboard the Nautilus.", "content": "The sea is everything. It covers seven tenths of the terrestrial globe.", "pages": 432, "popularity": 760, "blocked": False, "publisher_id": None},
            3: {"id": 3, "title": "Les Miserables", "author": "Victor Hugo", "genre": "Classic", "publication_date": date(1862, 4, 3), "description": "A novel about justice, redemption, and society.", "content": "As long as there exists, because of law and custom, a social condemnation.", "pages": 1463, "popularity": 620, "blocked": False, "publisher_id": None},
        }
        self.users: dict[int, dict[str, Any]] = {
            1: {"id": 1, "username": "alice", "email": "alice@example.com", "password": "password", "role": "reader", "points": 120, "premium": False, "avatar": "default-reader", "blocked": False},
            2: {"id": 2, "username": "publisher", "email": "publisher@example.com", "password": "password", "role": "publisher", "points": 600, "premium": False, "avatar": "publisher-level-2", "blocked": False},
            3: {"id": 3, "username": "admin", "email": "admin@example.com", "password": "password", "role": "admin", "points": 0, "premium": False, "avatar": "admin", "blocked": False},
        }
        self.reviews: list[dict[str, Any]] = [{"id": 1, "book_id": 1, "user_id": 1, "rating": 5, "text": "A short and memorable read."}, {"id": 2, "book_id": 2, "user_id": 2, "rating": 4, "text": "A great classic adventure."}]
        self.favorites: dict[int, set[int]] = {1: {1}}
        self.to_read: dict[int, set[int]] = {1: {2}}
        self.notes: list[dict[str, Any]] = []
        self.reading: dict[int, dict[int, dict[str, Any]]] = {}
        self.completed_books: dict[int, set[int]] = {}
        self.activities: list[dict[str, Any]] = []
        self.next_ids = {"user": 4, "book": 4, "review": 3, "note": 1}

    def public_user(self, user: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in user.items() if key not in {"password", "blocked"}}

    def visible_book(self, book: dict[str, Any]) -> dict[str, Any]:
        if book["blocked"]:
            raise HTTPException(status_code=404, detail="Book not found")
        return {key: value for key, value in book.items() if key not in {"content", "blocked"}}

    def book_reviews(self, book_id: int) -> list[dict[str, Any]]:
        return [review for review in self.reviews if review["book_id"] == book_id]

    def book_rating(self, book_id: int) -> float:
        ratings = [review["rating"] for review in self.book_reviews(book_id)]
        return round(sum(ratings) / len(ratings), 2) if ratings else 0.0

    def record_activity(self, user_id: int, action: str, item_type: str, item_id: int) -> None:
        self.activities.append({"action": action, "item_type": item_type, "item_id": item_id, "admin_id": user_id, "created_at": datetime.now(timezone.utc)})


store = MemoryStore()
