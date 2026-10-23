from fastapi import APIRouter

from app.api import admin, books, users
from app.api.endpoints import auth, health

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(health.router)
api_router.include_router(books.router)
api_router.include_router(books.reviews_router)
api_router.include_router(books.notes_router)
api_router.include_router(books.users_router)
api_router.include_router(users.router)
api_router.include_router(users.content_router)
api_router.include_router(users.premium_router)
api_router.include_router(admin.router)
