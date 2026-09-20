"""Import all models so SQLAlchemy registers their table metadata."""

from app.db.session import Base
from app.models.user import User

__all__ = ["Base", "User"]
