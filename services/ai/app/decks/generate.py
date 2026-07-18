"""RAG deck generation (plan §7.3): retrieve top-k exemplars → prompt the LLM
with them as style anchors + hard rules → parse JSON → moderate → return with
safety_reviewed=False (admin approves before decks go live).
"""

import json
import re
from pathlib import Path

from pydantic import BaseModel, Field

from app.config import Settings
from app.decks.ingest import retrieve
from app.decks.moderate import moderate_cards
from app.providers import ChatMessage, get_chat_provider

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text()


class GenerateRequest(BaseModel):
    kind: str
    level: int | None = None
    locale: str = "en"
    count: int = Field(default=10, ge=1, le=50)
    context_tags: list[str] = Field(default_factory=list)


class GeneratedCard(BaseModel):
    text: str
    safety_reviewed: bool = False


def _parse_cards(raw: str) -> list[str]:
    """Extract a JSON array of strings from the model output (retry-tolerant)."""
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []
    return [str(item).strip() for item in data if isinstance(item, str) and item.strip()]


async def generate_cards(settings: Settings, request: GenerateRequest) -> list[GeneratedCard]:
    exemplars = await retrieve(
        settings,
        query=" ".join(request.context_tags) or f"{request.kind} card",
        kind=request.kind,
        level=request.level,
        k=12,
    )
    system = _load_prompt("deck_generate.md")
    user = json.dumps(
        {
            "kind": request.kind,
            "level": request.level,
            "locale": request.locale,
            "context_tags": request.context_tags,
            "count": request.count,
            "exemplars": [c.text for c in exemplars[:8]],
        }
    )

    chat = get_chat_provider(settings)
    # moderate temperature → enough variety to fill a deck, still on-distribution
    raw = await chat.chat(
        [ChatMessage(role="system", content=system), ChatMessage(role="user", content=user)],
        temperature=0.35,
    )
    cards = _parse_cards(raw)
    if not cards:
        # one retry with a firmer nudge
        raw = await chat.chat(
            [
                ChatMessage(role="system", content=system),
                ChatMessage(role="user", content=user),
                ChatMessage(
                    role="user",
                    content='Return ONLY a JSON array of strings. Example: ["A?","B?"]',
                ),
            ],
            temperature=0.4,
        )
        cards = _parse_cards(raw)

    # keep only clean, well-formed, safe cards for this kind; de-dup within batch
    # (echoing a seed-quality exemplar is fine — the plan wants seed-quality output)
    verdicts = moderate_cards(cards, kind=request.kind)
    seen: set[str] = set()
    out: list[GeneratedCard] = []
    for v in verdicts:
        key = v.text.lower()
        if v.ok and key not in seen:
            seen.add(key)
            out.append(GeneratedCard(text=v.text))
    return out[: request.count]
