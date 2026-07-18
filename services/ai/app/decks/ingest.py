"""RAG ingestion + retrieval (plan §7.3). Chunk (per-card), embed with the
configured embedder, upsert into the configured vector store. Retrieval is
top-k cosine. Both auto-skip cleanly when no embedder is configured.
"""

from app.config import Settings
from app.decks.corpus import SEED_CORPUS, CorpusCard
from app.providers import get_embedding_provider
from app.vectorstore import VectorRecord, get_vector_store


async def ingest_corpus(settings: Settings) -> dict[str, object]:
    if not settings.embeddings_configured:
        return {"status": "skipped", "reason": "EMBEDDING_MODEL not configured"}

    embedder = get_embedding_provider(settings)
    store = get_vector_store(settings)
    collection = settings.qdrant_collection

    texts = [card.text for card in SEED_CORPUS]
    vectors = await embedder.embed(texts)
    records = [
        VectorRecord(
            id=card.doc_id,
            vector=vector,
            payload={
                "text": card.text,
                "kind": card.kind,
                "level": card.level or 0,
                "locale": card.locale,
                "tags": card.tags,
            },
        )
        for card, vector in zip(SEED_CORPUS, vectors, strict=True)
    ]
    await store.upsert(collection, records)
    return {"status": "ingested", "count": len(records), "collection": collection}


async def retrieve(
    settings: Settings,
    query: str,
    *,
    kind: str | None = None,
    level: int | None = None,
    k: int = 12,
) -> list[CorpusCard]:
    """Top-k similar corpus cards for the query, optionally filtered by kind/level."""
    embedder = get_embedding_provider(settings)
    store = get_vector_store(settings)
    query_vec = (await embedder.embed([query]))[0]
    filters: dict[str, object] = {}
    if kind is not None:
        filters["kind"] = kind
    if level is not None:
        filters["level"] = level
    hits = await store.search(
        settings.qdrant_collection, query_vec, limit=k, filters=filters or None
    )
    return [
        CorpusCard(
            text=str(hit.payload.get("text", "")),
            kind=str(hit.payload.get("kind", kind or "")),
            level=int(hit.payload["level"]) if hit.payload.get("level") else None,
            locale=str(hit.payload.get("locale", "en")),
            tags=list(hit.payload.get("tags", [])),
        )
        for hit in hits
    ]
