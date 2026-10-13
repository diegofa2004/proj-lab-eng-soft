from datetime import date

from pydantic import BaseModel, Field


class BookCreate(BaseModel):
    title: str = Field(min_length=1)
    author: str = Field(min_length=1)
    genre: str = Field(min_length=1)
    publication_date: date
    description: str = Field(min_length=1)
    content: str = Field(min_length=1)
    pages: int = Field(gt=0)


class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    genre: str | None = None
    publication_date: date | None = None
    description: str | None = None


class ProgressUpdate(BaseModel):
    pages_read: int = Field(ge=0)
    minutes_read: int = Field(ge=0)
