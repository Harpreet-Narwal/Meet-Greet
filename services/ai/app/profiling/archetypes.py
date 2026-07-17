"""The 8 archetypes — the energy x depth x novelty (x structure) grid.

Loaded verbatim from docs/seed-content.md §2. Order matters: first match wins,
"Quiet Observer" is the catch-all.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Archetype:
    name: str
    emoji: str
    blurb: str


WARM_FIRECRACKER = Archetype(
    "Warm Firecracker",
    "🔥",
    "You light up rooms AND go deep. Dangerous combination. Tables fight over you.",
)
SOCIAL_ALCHEMIST = Archetype(
    "Social Alchemist",
    "✨",
    "You turn six strangers into a group chat. It's basically a superpower.",
)
PLAYFUL_SPARK = Archetype(
    "Playful Spark",
    "🎈",
    "You keep it light, keep it fun, and somehow know everyone's name by round two.",
)
COZY_PHILOSOPHER = Archetype(
    "Cozy Philosopher",
    "🍵",
    "Quiet until the conversation gets real — then nobody can keep up with you.",
)
CURIOUS_WANDERER = Archetype(
    "Curious Wanderer",
    "🧭",
    "You ask the questions nobody expects and order the dish nobody can pronounce.",
)
STEADY_ANCHOR = Archetype(
    "Steady Anchor",
    "⚓",
    "Every great table needs one person holding it together. Hi, it's you.",
)
GENTLE_REBEL = Archetype(
    "Gentle Rebel",
    "🌊",
    "Low-key on the surface, plot twist underneath. People underestimate you exactly once.",
)
QUIET_OBSERVER = Archetype(
    "Quiet Observer",
    "🌙",
    "You notice everything, say the perfect thing at the perfect time, and win the whole table.",
)


def pick_archetype(energy: float, depth: float, novelty: float, structure: float) -> Archetype:
    if energy >= 0.3 and depth >= 0.3:
        return WARM_FIRECRACKER
    if energy >= 0.3 and depth < 0.3 and novelty >= 0:
        return SOCIAL_ALCHEMIST
    if energy >= 0.3 and depth < 0.3 and novelty < 0:
        return PLAYFUL_SPARK
    if energy < 0.3 and depth >= 0.3 and novelty < 0:
        return COZY_PHILOSOPHER
    if energy < 0.3 and depth >= 0.3 and novelty >= 0:
        return CURIOUS_WANDERER
    if energy < 0.3 and depth < 0.3 and structure >= 0.3:
        return STEADY_ANCHOR
    if energy < 0.3 and depth < 0.3 and novelty >= 0.3:
        return GENTLE_REBEL
    return QUIET_OBSERVER
