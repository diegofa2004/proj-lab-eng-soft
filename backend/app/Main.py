from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.auth import users_router as auth_users_router
from app.api.books import notes_router
from app.api.books import reviews_router
from app.api.books import router as books_router
from app.api.users import content_router
from app.api.users import premium_router
from app.api.users import router as users_router
from app.core.config import settings


app = FastAPI(
    title=settings.app_name,
    description="In-memory demonstration API with no database.",
    version=settings.app_version,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "LivrUSP in-memory API"}


app.include_router(auth_router)
app.include_router(auth_users_router)
app.include_router(books_router)
app.include_router(reviews_router)
app.include_router(notes_router)
app.include_router(users_router)
app.include_router(content_router)
app.include_router(premium_router)
app.include_router(admin_router)
