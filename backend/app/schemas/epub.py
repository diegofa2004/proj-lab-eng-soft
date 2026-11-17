from pydantic import BaseModel


class EpubPreview(BaseModel):
    total_palavras: int
    total_paginas: int
