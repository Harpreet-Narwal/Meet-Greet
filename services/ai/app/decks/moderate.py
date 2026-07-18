"""Safety moderation for generated cards (plan §7.3). Deterministic hard checks
(regex/keyword + length) — no LLM needed. Cards failing any check are rejected;
survivors return with safety_reviewed=False for admin approval.
"""

import re
from dataclasses import dataclass

MAX_LEN = 140

# Topics that must never appear (plan §7.3): politics, religion, caste,
# income/salary, appearance, sexual content.
_BANNED = re.compile(
    r"\b("
    r"salary|income|how much (do|does) .* (earn|make)|net worth|"
    r"caste|brahmin|dalit|reservation quota|"
    r"hindu|muslim|christian|sikh|religion|temple vs|"
    r"modi|bjp|congress|rahul gandhi|election|politician|"
    r"sexy|hookup|one night|virgin|body count|"
    r"fat|ugly|skin colour|skin color|fair skin|complexion"
    r")\b",
    re.IGNORECASE,
)


MIN_LEN = 12

# meta / wrapper text a chatty model sometimes emits instead of a clean card
_META = re.compile(
    r"^(here('?s| is| are)|sure[,!]|option \d|card \d|\d+[.)]|prompt:|question:)",
    re.IGNORECASE,
)


@dataclass
class Verdict:
    text: str
    ok: bool
    reasons: list[str]


def _well_formed(text: str, kind: str | None) -> list[str]:
    """Per-kind format rules so the pipeline only returns clean, single-prompt
    cards (a production generator self-filters before an admin ever sees them)."""
    reasons: list[str] = []
    if len(text) < MIN_LEN:
        reasons.append("too_short")
    if _META.search(text):
        reasons.append("meta_text")
    # a rhetorical "A or B? which?" reads as one prompt; only flag 3+ questions
    if text.count("?") > 2:
        reasons.append("multiple_questions")
    if "\n" in text:
        reasons.append("multiline")
    # kind-specific shape
    if kind in ("icebreaker",) and "?" not in text:
        reasons.append("not_a_question")
    if kind == "most_likely" and "?" not in text:
        reasons.append("not_a_question")
    return reasons


def moderate_cards(texts: list[str], kind: str | None = None) -> list[Verdict]:
    verdicts: list[Verdict] = []
    for text in texts:
        stripped = text.strip().strip('"').strip()
        reasons: list[str] = []
        if not stripped:
            reasons.append("empty")
        if len(stripped) > MAX_LEN:
            reasons.append("too_long")
        if _BANNED.search(stripped):
            reasons.append("banned_topic")
        reasons.extend(_well_formed(stripped, kind))
        verdicts.append(Verdict(text=stripped, ok=len(reasons) == 0, reasons=reasons))
    return verdicts
