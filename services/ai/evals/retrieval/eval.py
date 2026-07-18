"""Retrieval eval suite (plan §10). Needs an embedder (nightly CI pulls one).

For each golden query, retrieve top-5 corpus cards and check that at least one
labeled-relevant card is present (hit-rate@5) and compute MRR. Pass =
hit-rate@5 ≥ EVAL_PASS_THRESHOLD.
"""

import asyncio
import json
from pathlib import Path
from statistics import mean

from app.config import get_settings
from app.decks.ingest import ingest_corpus, retrieve

GOLDEN = Path(__file__).parent / "golden" / "queries.jsonl"


def _load() -> list[dict[str, object]]:
    with GOLDEN.open() as f:
        return [json.loads(line) for line in f if line.strip()]


async def _score() -> float:
    settings = get_settings()
    if not settings.embeddings_configured:
        print("    EMBEDDING_MODEL not configured — retrieval eval needs an embedder")
        return 0.0

    await ingest_corpus(settings)
    queries = _load()
    hits: list[int] = []
    reciprocal_ranks: list[float] = []

    for item in queries:
        query = str(item["query"])
        relevant = item["relevant_contains"]
        assert isinstance(relevant, list)
        needles = [str(s).lower() for s in relevant]
        results = await retrieve(settings, query, k=5)
        rank = 0
        for idx, card in enumerate(results, start=1):
            if any(n in card.text.lower() for n in needles):
                rank = idx
                break
        hits.append(1 if rank > 0 else 0)
        reciprocal_ranks.append(1.0 / rank if rank > 0 else 0.0)

    hit_rate = mean(hits) if hits else 0.0
    mrr = mean(reciprocal_ranks) if reciprocal_ranks else 0.0
    print(f"    queries={len(queries)} hit_rate@5={hit_rate:.3f} mrr={mrr:.3f}")
    return hit_rate


def run() -> float:
    return asyncio.run(_score())
