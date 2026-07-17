import json
import re
from typing import Any

import psycopg
from psycopg.rows import tuple_row

from app.vectorstore.base import SearchHit, VectorRecord

_COLLECTION_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def _table_name(collection: str) -> str:
    if not _COLLECTION_RE.match(collection):
        raise ValueError(f"invalid collection name: {collection!r}")
    return f"vs_{collection}"


class PgVectorStore:
    """pgvector-backed store — one table per collection in the `ai` schema.

    Same interface as QdrantStore; this is the prod-simplification path
    (IMPLEMENTATION_PLAN.md §13) and must stay green in tests.
    """

    def __init__(self, database_url: str, dim: int) -> None:
        self._database_url = database_url
        self._dim = dim

    async def _connect(self) -> psycopg.AsyncConnection[Any]:
        return await psycopg.AsyncConnection.connect(self._database_url, row_factory=tuple_row)

    async def _ensure_collection(self, conn: psycopg.AsyncConnection[Any], collection: str) -> None:
        table = _table_name(collection)
        await conn.execute("CREATE SCHEMA IF NOT EXISTS ai")
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        await conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS ai.{table} (
                id TEXT PRIMARY KEY,
                embedding vector({self._dim}) NOT NULL,
                payload JSONB NOT NULL DEFAULT '{{}}'::jsonb
            )
            """
        )

    async def upsert(self, collection: str, records: list[VectorRecord]) -> None:
        table = _table_name(collection)
        async with await self._connect() as conn:
            await self._ensure_collection(conn, collection)
            async with conn.cursor() as cur:
                for r in records:
                    await cur.execute(
                        f"""
                        INSERT INTO ai.{table} (id, embedding, payload)
                        VALUES (%s, %s::vector, %s::jsonb)
                        ON CONFLICT (id)
                        DO UPDATE SET embedding = EXCLUDED.embedding, payload = EXCLUDED.payload
                        """,
                        (r.id, json.dumps(r.vector), json.dumps(r.payload)),
                    )
            await conn.commit()

    async def search(
        self,
        collection: str,
        vector: list[float],
        *,
        limit: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> list[SearchHit]:
        table = _table_name(collection)
        where = ""
        params: list[Any] = [json.dumps(vector)]
        if filters:
            where = "WHERE payload @> %s::jsonb"
            params.append(json.dumps(filters))
        params.append(limit)
        async with await self._connect() as conn, conn.cursor() as cur:
            await cur.execute(
                f"""
                    SELECT id, 1 - (embedding <=> %s::vector) AS score, payload
                    FROM ai.{table}
                    {where}
                    ORDER BY score DESC
                    LIMIT %s
                    """,
                params,
            )
            rows = await cur.fetchall()
        return [SearchHit(id=row[0], score=float(row[1]), payload=row[2]) for row in rows]

    async def delete_collection(self, collection: str) -> None:
        table = _table_name(collection)
        async with await self._connect() as conn:
            await conn.execute(f"DROP TABLE IF EXISTS ai.{table}")
            await conn.commit()
