from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import current_user
from app.db.memory import store
from app.schemas.books import BookCreate, BookUpdate, ProgressUpdate
from app.schemas.interactions import NoteCreate, ReviewCreate

router = APIRouter(prefix="/books", tags=["books"])
reviews_router = APIRouter(prefix="/reviews", tags=["reviews"])
notes_router = APIRouter(prefix="/notes", tags=["notes"])


def find_book(book_id: int) -> dict[str, Any]:
    book = store.books.get(book_id)
    if book is None or book["blocked"]:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.get("")
def search_books(title: str | None = None, author: str | None = None, genre: str | None = None, publication_date: date | None = None, sort: str | None = Query(default=None, pattern="^(popularity|rating)$")) -> list[dict[str, Any]]:
    books = [book for book in store.books.values() if not book["blocked"]]
    if title:
        books = [book for book in books if title.lower() in book["title"].lower()]
    if author:
        books = [book for book in books if author.lower() in book["author"].lower()]
    if genre:
        books = [book for book in books if genre.lower() in book["genre"].lower()]
    if publication_date:
        books = [book for book in books if book["publication_date"] == publication_date]
    if sort == "popularity":
        books.sort(key=lambda book: book["popularity"], reverse=True)
    elif sort == "rating":
        books.sort(key=lambda book: store.book_rating(book["id"]), reverse=True)
    return [{**store.visible_book(book), "rating": store.book_rating(book["id"])} for book in books]


@router.get("/{book_id}")
def get_book(book_id: int) -> dict[str, Any]:
    book = find_book(book_id)
    return {**store.visible_book(book), "rating": store.book_rating(book_id), "reviews_count": len(store.book_reviews(book_id))}


@router.get("/{book_id}/reviews")
def get_reviews(book_id: int) -> list[dict[str, Any]]:
    find_book(book_id)
    return [{**review, "username": store.users.get(review["user_id"], {}).get("username", "User")} for review in store.book_reviews(book_id)]


@router.post("/{book_id}/reviews", status_code=status.HTTP_201_CREATED)
def create_review(book_id: int, payload: ReviewCreate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    find_book(book_id)
    if any(review["book_id"] == book_id and review["user_id"] == user["id"] for review in store.reviews):
        raise HTTPException(status_code=409, detail="You have already reviewed this book")
    review = {"id": store.next_ids["review"], "book_id": book_id, "user_id": user["id"], **payload.model_dump()}
    store.next_ids["review"] += 1
    store.reviews.append(review)
    return review


@reviews_router.delete("/{review_id}")
def delete_review(review_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    review = next((item for item in store.reviews if item["id"] == review_id), None)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    if review["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="You cannot delete this review")
    store.reviews.remove(review)
    return {"message": "Review deleted"}


@router.post("", status_code=status.HTTP_201_CREATED)
def publish_book(payload: BookCreate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user["role"] != "admin" and user["points"] < 500 and not user["premium"]:
        raise HTTPException(status_code=403, detail="Publisher level or premium subscription required")
    book_id = store.next_ids["book"]
    store.next_ids["book"] += 1
    store.books[book_id] = {"id": book_id, **payload.model_dump(), "popularity": 0, "blocked": False, "publisher_id": user["id"]}
    return store.visible_book(store.books[book_id])


@router.get("/{book_id}/read")
def read_book(book_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    book = find_book(book_id)
    book["popularity"] += 1
    return {"book_id": book_id, "title": book["title"], "pages": book["pages"], "content": book["content"]}


@router.post("/{book_id}/progress")
def update_progress(book_id: int, payload: ProgressUpdate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    book = find_book(book_id)
    store.reading.setdefault(user["id"], {})[book_id] = {"pages_read": min(payload.pages_read, book["pages"]), "minutes_read": payload.minutes_read}
    if payload.pages_read >= book["pages"] and book_id not in store.completed_books.setdefault(user["id"], set()):
        store.completed_books[user["id"]].add(book_id)
        user["points"] += 10
    return store.reading[user["id"]][book_id]


@router.get("/{book_id}/notes")
def get_notes(book_id: int, user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    find_book(book_id)
    return [note for note in store.notes if note["book_id"] == book_id and note["user_id"] == user["id"]]


@router.post("/{book_id}/notes", status_code=status.HTTP_201_CREATED)
def create_note(book_id: int, payload: NoteCreate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    find_book(book_id)
    note = {"id": store.next_ids["note"], "book_id": book_id, "user_id": user["id"], **payload.model_dump()}
    store.next_ids["note"] += 1
    store.notes.append(note)
    return note


@notes_router.put("/{note_id}")
def update_note(note_id: int, payload: NoteCreate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    note = next((item for item in store.notes if item["id"] == note_id and item["user_id"] == user["id"]), None)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    note["text"] = payload.text
    return note


@notes_router.delete("/{note_id}")
def delete_note(note_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    note = next((item for item in store.notes if item["id"] == note_id and item["user_id"] == user["id"]), None)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    store.notes.remove(note)
    return {"message": "Note deleted"}
