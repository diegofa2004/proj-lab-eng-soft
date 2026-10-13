from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=1)


class NoteCreate(BaseModel):
    text: str = Field(min_length=1)
