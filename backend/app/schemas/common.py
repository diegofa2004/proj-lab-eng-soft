from typing import Annotated, ClassVar

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


class PublicSchema(BaseModel):
    """Base for response contracts backed by SQLAlchemy models."""

    model_config = ConfigDict(from_attributes=True)
    non_nullable_fields: ClassVar[frozenset[str]] = frozenset()

    @model_validator(mode="before")
    @classmethod
    def reject_null_for_required_columns(cls, data: object) -> object:
        if isinstance(data, dict) and cls.non_nullable_fields.intersection(
            key for key, value in data.items() if value is None
        ):
            raise ValueError("A required field cannot be null")
        return data


PositiveId = Annotated[int, Field(gt=0)]
NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
ProfileName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
ShortName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
MediumName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
AuthorName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
BookTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
