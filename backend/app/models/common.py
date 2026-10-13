from sqlalchemy import BigInteger, Identity
from sqlalchemy.orm import mapped_column

SCHEMA = "plataforma"


def primary_key_column():
    return mapped_column(BigInteger, Identity(always=True), primary_key=True)
