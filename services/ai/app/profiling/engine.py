"""Deterministic profile computation — no LLM in the scoring path (plan §7.1).

Trait scores: weighted sum of answer weights, normalized by the quiz
definition's per-trait ceiling, clamped to [-1, 1]. Reproducible by design.
The LLM (when configured) only personalizes the share-card blurb; the
template blurbs are the always-available fallback.
"""

from collections import Counter

from app.profiling.archetypes import pick_archetype
from app.profiling.models import TRAITS, ProfileRequest, ProfileResponse, Traits


def _clamp(value: float, low: float = -1.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def compute_traits(request: ProfileRequest) -> Traits:
    sums: dict[str, float] = dict.fromkeys(TRAITS, 0.0)
    for answer in request.answers:
        for trait, weight in answer.weights.items():
            if trait in sums:
                sums[trait] += weight

    normalized: dict[str, float] = {}
    for trait in TRAITS:
        ceiling = request.trait_max.get(trait, 0.0)
        normalized[trait] = _clamp(sums[trait] / ceiling) if ceiling > 0 else 0.0
    return Traits(**normalized)


def collect_humor_styles(request: ProfileRequest) -> list[str]:
    counts = Counter(style for answer in request.answers for style in answer.humor_styles)
    return [style for style, _count in counts.most_common(3)]


def compute_profile(request: ProfileRequest) -> ProfileResponse:
    traits = compute_traits(request)
    archetype = pick_archetype(traits.energy, traits.depth, traits.novelty, traits.structure)
    blurb = archetype.blurb
    if request.first_name:
        blurb = f"{request.first_name}, {blurb[0].lower()}{blurb[1:]}"
    return ProfileResponse(
        traits=traits,
        humor_styles=collect_humor_styles(request),
        archetype=archetype.name,
        archetype_emoji=archetype.emoji,
        blurb=blurb,
    )
