from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import current_user, require_admin
from app.db.memory import store
from app.schemas.books import BookUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


def admin_user(user: dict[str, Any]) -> dict[str, Any]:
    require_admin(user)
    return user


@router.patch("/books/{book_id}")
def update_catalog(book_id: int, payload: BookUpdate, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    admin_user(user)
    book = store.books.get(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        book[key] = value
    store.record_activity(user["id"], "update", "book", book_id)
    return store.visible_book(book)


@router.post("/books/{book_id}/block")
def block_book(book_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    admin_user(user)
    if book_id not in store.books:
        raise HTTPException(status_code=404, detail="Book not found")
    store.books[book_id]["blocked"] = True
    store.record_activity(user["id"], "block", "book", book_id)
    return {"message": "Book blocked"}


@router.post("/books/{book_id}/unblock")
def unblock_book(book_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    admin_user(user)
    if book_id not in store.books:
        raise HTTPException(status_code=404, detail="Book not found")
    store.books[book_id]["blocked"] = False
    store.record_activity(user["id"], "unblock", "book", book_id)
    return {"message": "Book unblocked"}


@router.post("/users/{user_id}/block")
def block_user(user_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    admin_user(user)
    target = store.users.get(user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    target["blocked"] = True
    store.record_activity(user["id"], "block", "user", user_id)
    return {"message": "User blocked"}


@router.post("/users/{user_id}/unblock")
def unblock_user(user_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    admin_user(user)
    target = store.users.get(user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    target["blocked"] = False
    store.record_activity(user["id"], "unblock", "user", user_id)
    return {"message": "User unblocked"}


@router.get("/users")
def users(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    admin_user(user)
    return [store.public_user(item) | {"blocked": item["blocked"]} for item in store.users.values()]


@router.get("/activity")
def activity(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    admin_user(user)
    return store.activity


@router.get("/stats")
def stats(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    admin_user(user)
    accesses = {book["id"]: book["popularity"] for book in store.books.values()}
    by_genre: dict[str, int] = {}
    for book in store.books.values():
        by_genre[book["genre"]] = by_genre.get(book["genre"], 0) + book["popularity"]
    return {"users": {"total": len(store.users), "active": sum(not item["blocked"] for item in store.users.values()), "blocked": sum(item["blocked"] for item in store.users.values())}, "accesses_by_book": accesses, "accesses_by_genre": by_genre, "books": len(store.books), "reviews": len(store.reviews)}
