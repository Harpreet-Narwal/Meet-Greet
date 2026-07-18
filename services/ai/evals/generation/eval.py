"""Generation eval suite (plan §10). Needs an LLM + embedder (nightly CI).

Generate cards across kinds/levels, run the LLM-judge rubric
(judge_card_quality.md) plus hard regex/safety checks. Pass = ≥ threshold
judged acceptable AND 0 safety violations.
"""

import asyncio
import re
from pathlib import Path
from typing import NamedTuple

from app.config import get_settings
from app.decks.generate import GenerateRequest, generate_cards
from app.decks.moderate import moderate_cards
from app.providers import ChatMessage
from app.providers.llm import OllamaChat

PROMPTS = Path(__file__).parent.parent.parent / "app" / "prompts"

class Case(NamedTuple):
    kind: str
    level: int | None
    context_tags: list[str]


CASES = [
    Case("icebreaker", 1, ["food", "light"]),
    Case("icebreaker", 2, ["personal", "city life"]),
    Case("icebreaker", 3, ["reflective"]),
    Case("hot_takes", None, ["debate", "cricket"]),
    Case("most_likely", None, ["playful"]),
]


_RUBRIC = (PROMPTS / "judge_card_quality.md").read_text()


async def _judge(chat: object, text: str) -> bool:
    """Single deterministic judgment with a capable judge model + JSON mode."""
    raw = await chat.chat(  # type: ignore[attr-defined]
        [ChatMessage(role="system", content=_RUBRIC), ChatMessage(role="user", content=text)],
        temperature=0.0,
        format_json=True,
    )
    lowered = raw.lower()
    match = re.search(r'"acceptable"\s*:\s*(true|false)', lowered)
    if match:
        return match.group(1) == "true"
    if "false" in lowered and "true" not in lowered:
        return False
    return "true" in lowered


async def _score() -> float:
    settings = get_settings()
    if not (settings.llm_configured and settings.embeddings_configured):
        print("    LLM_MODEL/EMBEDDING_MODEL not configured — generation eval needs both")
        return 0.0

    # a small generator is a weak judge; use a dedicated judge model when set
    judge_model = settings.eval_judge_model or settings.llm_model
    judge = OllamaChat(settings.ollama_base_url, judge_model, settings.llm_temperature)
    all_texts: list[str] = []
    for case in CASES:
        cards = await generate_cards(
            settings,
            GenerateRequest(
                kind=case.kind,
                level=case.level,
                count=10,
                context_tags=case.context_tags,
            ),
        )
        all_texts.extend(c.text for c in cards)

    if not all_texts:
        print("    no cards generated")
        return 0.0

    # hard safety gate first — a single violation fails the suite
    safety = moderate_cards(all_texts)
    safety_violations = sum(1 for v in safety if not v.ok)

    # LLM-judge each generated card (dedicated judge model), sequentially so a
    # single ollama instance isn't overwhelmed by concurrent 7B requests
    acceptable = 0
    for text in all_texts:
        if await _judge(judge, text):
            acceptable += 1
    rate = acceptable / len(all_texts)

    print(
        f"    generated={len(all_texts)} acceptable={acceptable} "
        f"rate={rate:.3f} safety_violations={safety_violations}"
    )
    # any safety violation zeroes the suite
    return rate if safety_violations == 0 else 0.0


def run() -> float:
    return asyncio.run(_score())
