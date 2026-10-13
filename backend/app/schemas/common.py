from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class PublicSchema(BaseModel):
    """Base for response contracts backed by SQLAlchemy models."""

    model_config = ConfigDict(from_attributes=True)


PositiveId = Annotated[int, Field(gt=0)]
NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
ProfileName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
ShortName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
MediumName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
AuthorName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
BookTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
