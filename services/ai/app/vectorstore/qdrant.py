from typing import Any
from uuid import NAMESPACE_URL, uuid5

from qdrant_client import AsyncQdrantClient, models

from app.vectorstore.base import SearchHit, VectorRecord


class QdrantStore:
    def __init__(self, url: str, dim: int) -> None:
        self._client = AsyncQdrantClient(url=url)
        self._dim = dim

    async def _ensure_collection(self, collection: str) -> None:
        if not await self._client.collection_exists(collection):
            await self._client.create_collection(
                collection_name=collection,
                vectors_config=models.VectorParams(size=self._dim, distance=models.Distance.COSINE),
            )

    @staticmethod
    def _point_id(record_id: str) -> str:
        # Qdrant point ids must be UUIDs or unsigned ints; derive a stable UUID
        # from the caller's string id and keep the original in the payload.
        return str(uuid5(NAMESPACE_URL, record_id))

    async def upsert(self, collection: str, records: list[VectorRecord]) -> None:
        await self._ensure_collection(collection)
        await self._client.upsert(
            collection_name=collection,
            points=[
                models.PointStruct(
                    id=self._point_id(r.id),
                    vector=r.vector,
                    payload={**r.payload, "_id": r.id},
                )
                for r in records
            ],
        )

    async def search(
        self,
        collection: str,
        vector: list[float],
        *,
        limit: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> list[SearchHit]:
        query_filter = None
        if filters:
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(key=key, match=models.MatchValue(value=value))
                    for key, value in filters.items()
                ]
            )
        response = await self._client.query_points(
            collection_name=collection,
            query=vector,
            limit=limit,
            query_filter=query_filter,
            with_payload=True,
        )
        hits: list[SearchHit] = []
        for point in response.points:
            payload = dict(point.payload or {})
            original_id = str(payload.pop("_id", point.id))
            hits.append(SearchHit(id=original_id, score=point.score, payload=payload))
        return hits

    async def delete_collection(self, collection: str) -> None:
        if await self._client.collection_exists(collection):
            await self._client.delete_collection(collection)
