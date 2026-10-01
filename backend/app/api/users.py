from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import current_user
from app.db.memory import store
from app.schemas.auth import AssetUpdate, InactivityRequest, ProfileUpdate, SubscriptionRequest

router = APIRouter(prefix="/users/me", tags=["users"])
content_router = APIRouter(prefix="/content", tags=["content"])
premium_router = APIRouter(prefix="/premium", tags=["premium"])


def find_visible_book(book_id: int) -> dict[str, Any]:
    book = store.books.get(book_id)
    if book is None or book["blocked"]:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.get("/dashboard")
def dashboard(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    history = store.reading.get(user["id"], {})
    book_items = [store.books[book_id] for book_id in history if book_id in store.books]
    return {"books_read": len(store.completed_books.get(user["id"], set())), "pages_read": sum(item["pages_read"] for item in history.values()), "minutes_read": sum(item["minutes_read"] for item in history.values()), "genres": sorted({book["genre"] for book in book_items}), "authors": sorted({book["author"] for book in book_items})}


@router.get("/suggestions")
def suggestions(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    history = store.reading.get(user["id"], {})
    genres = {store.books[book_id]["genre"] for book_id in history if book_id in store.books}
    return [store.visible_book(book) for book in store.books.values() if not book["blocked"] and (not genres or book["genre"] in genres)]


@router.get("/favorites")
def get_favorites(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return [store.visible_book(store.books[book_id]) for book_id in store.favorites.get(user["id"], set()) if book_id in store.books and not store.books[book_id]["blocked"]]


@router.post("/favorites/{book_id}")
def add_favorite(book_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    find_visible_book(book_id)
    store.favorites.setdefault(user["id"], set()).add(book_id)
    return {"message": "Book added to favorites"}


@router.delete("/favorites/{book_id}")
def remove_favorite(book_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    store.favorites.setdefault(user["id"], set()).discard(book_id)
    return {"message": "Book removed from favorites"}


@router.get("/to-read")
def get_to_read(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return [store.visible_book(store.books[book_id]) for book_id in store.to_read.get(user["id"], set()) if book_id in store.books and not store.books[book_id]["blocked"]]


@router.post("/to-read/{book_id}")
def add_to_read(book_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    find_visible_book(book_id)
    store.to_read.setdefault(user["id"], set()).add(book_id)
    return {"message": "Book added to reading list"}


@router.delete("/to-read/{book_id}")
def remove_to_read(book_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    store.to_read.setdefault(user["id"], set()).discard(book_id)
    return {"message": "Book removed from reading list"}


@router.post("/subscription")
def subscribe(payload: SubscriptionRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    user["premium"] = True
    return {"premium": True, "plan": payload.plan, "user": store.public_user(user)}


@router.get("/points")
def points(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    level = 1 + user["points"] // 250
    return {"points": user["points"], "level": level, "next_level_threshold": level * 250, "publisher": user["points"] >= 500}


@router.post("/inactivity")
def inactivity(payload: InactivityRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    user["points"] = max(0, user["points"] - payload.days)
    return points(user)


@router.get("/assets")
def profile_assets(user: dict[str, Any] = Depends(current_user)) -> dict[str, list[str]]:
    assets = ["default-reader"]
    if user["points"] >= 500:
        assets.append("publisher-level-2")
    if user["premium"]:
        assets.append("premium-exclusive")
    return {"available": assets}


@router.patch("/assets")
def select_profile_asset(payload: AssetUpdate, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    assets = profile_assets(user)["available"]
    if payload.asset not in assets:
        raise HTTPException(status_code=403, detail="Asset is locked or unavailable")
    user["avatar"] = payload.asset
    return {"avatar": user["avatar"]}


@premium_router.get("/discover")
def discover_books(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    if not user["premium"]:
        raise HTTPException(status_code=403, detail="Premium subscription required")
    return [store.visible_book(book) for book in store.books.values() if not book["blocked"]]


@content_router.get("/user-created")
def user_created_content() -> list[dict[str, Any]]:
    return [store.visible_book(book) for book in store.books.values() if book["publisher_id"] is not None and not book["blocked"]]
