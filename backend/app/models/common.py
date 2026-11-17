from sqlalchemy import BigInteger, Identity, Integer
from sqlalchemy.orm import mapped_column

SCHEMA = "plataforma"


def primary_key_column():
    # SQLite only auto-increments an ``INTEGER PRIMARY KEY``. Keeping this variant
    # makes the lightweight test database behave like PostgreSQL identities.
    return mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), Identity(always=True), primary_key=True
    )
