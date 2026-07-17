from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.deps import SettingsDep, require_internal_token
from app.providers import get_chat_provider

router = APIRouter(prefix="/decks", dependencies=[Depends(require_internal_token)])


class IngestRequest(BaseModel):
    collection: str | None = None


@router.post("/ingest")
async def ingest(body: IngestRequest, settings: SettingsDep) -> dict[str, Any]:
    """(Re)ingest the deck corpus into the vector store.

    Skips gracefully when no embedder is configured — `make seed` must succeed
    on a stack with no models pulled (IMPLEMENTATION_PLAN.md §5).
    """
    if not settings.embeddings_configured:
        return {"status": "skipped", "reason": "EMBEDDING_MODEL not configured"}
    # TODO(M6): read corpus from ai.documents, chunk per card, embed, upsert.
    return {"status": "skipped", "reason": "ingestion pipeline lands in M6 (corpus not seeded yet)"}


class GenerateRequest(BaseModel):
    kind: Literal["icebreaker", "hot_takes", "most_likely", "trivia", "two_truths"]
    level: int | None = Field(default=None, ge=1, le=3)
    locale: Literal["en", "hinglish"] = "en"
    count: int = Field(default=10, ge=1, le=50)
    context_tags: list[str] = Field(default_factory=list)


@router.post("/generate")
async def generate(body: GenerateRequest, settings: SettingsDep) -> dict[str, Any]:
    """RAG-powered card generation. 503 with a clear error when no LLM is configured."""
    get_chat_provider(settings)  # raises ProviderNotConfiguredError → 503
    # TODO(M6): retrieve top-k exemplars, prompt from app/prompts/deck_generate.md,
    # parse, moderate, return with safety_reviewed=false.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="deck generation lands in M6",
    )
