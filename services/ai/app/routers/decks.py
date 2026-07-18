from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.decks import generate_cards, ingest_corpus, moderate_cards
from app.decks.generate import GenerateRequest
from app.deps import SettingsDep, require_internal_token
from app.providers import get_chat_provider

router = APIRouter(prefix="/decks", dependencies=[Depends(require_internal_token)])


class IngestRequest(BaseModel):
    collection: str | None = None


@router.post("/ingest")
async def ingest(body: IngestRequest, settings: SettingsDep) -> dict[str, Any]:
    """(Re)ingest the deck corpus into the vector store. Skips gracefully when no
    embedder is configured — `make seed` must succeed on a modelless stack."""
    return await ingest_corpus(settings)


@router.post("/generate")
async def generate(body: GenerateRequest, settings: SettingsDep) -> dict[str, Any]:
    """RAG-powered card generation. 503 with a clear error when no LLM is set."""
    get_chat_provider(settings)  # raises ProviderNotConfiguredError → 503
    cards = await generate_cards(settings, body)
    return {"cards": [c.model_dump() for c in cards], "safety_reviewed": False}


class ModerateRequest(BaseModel):
    cards: list[str] = Field(min_length=1)


@router.post("/moderate")
async def moderate(body: ModerateRequest) -> dict[str, Any]:
    """Deterministic safety pass — no LLM needed."""
    verdicts = moderate_cards(body.cards)
    return {
        "verdicts": [{"text": v.text, "ok": v.ok, "reasons": v.reasons} for v in verdicts],
        "accepted": sum(1 for v in verdicts if v.ok),
    }
