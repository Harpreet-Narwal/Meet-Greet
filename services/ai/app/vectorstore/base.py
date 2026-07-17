"""VectorStore protocol — Qdrant (default) and pgvector implement the identical
interface. Swapping stores is a VECTOR_STORE env change, zero code changes
(IMPLEMENTATION_PLAN.md §4).
"""

from typing import Any, Protocol

from pydantic import BaseModel, Field


class VectorRecord(BaseModel):
    id: str
    vector: list[float]
    payload: dict[str, Any] = Field(default_factory=dict)


class SearchHit(BaseModel):
    id: str
    score: float
    payload: dict[str, Any] = Field(default_factory=dict)


class VectorStore(Protocol):
    async def upsert(self, collection: str, records: list[VectorRecord]) -> None:
        """Insert or replace records, creating the collection if needed."""
        ...

    async def search(
        self,
        collection: str,
        vector: list[float],
        *,
        limit: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> list[SearchHit]:
        """Cosine-similarity search; `filters` are exact-match payload conditions."""
        ...

    async def delete_collection(self, collection: str) -> None:
        """Drop the collection entirely (idempotent)."""
        ...
