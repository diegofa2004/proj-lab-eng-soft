from fastapi import APIRouter

from app.api import admin as existing_admin
from app.api import books, users
from app.api.endpoints import account, admin, auth, catalog, health, reading, reference

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
api_router.include_router(existing_admin.router)

v2_router = APIRouter(prefix="/v2")
for router in (
    auth.router,
    health.router,
    account.router,
    admin.router,
    catalog.router,
    reading.router,
    reference.router,
):
    v2_router.include_router(router)

api_router.include_router(v2_router)
