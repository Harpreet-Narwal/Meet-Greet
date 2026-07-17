"""Table chemistry scoring (plan §7.2). Weighted sum of components, each in
[0, 1]. Pure functions — deterministic, side-effect-free.
"""

from itertools import combinations
from statistics import pvariance
from typing import Any

from app.matching.models import Attendee, MatchParams


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 0.0
    union = a | b
    return len(a & b) / len(union) if union else 0.0


def interest_overlap(table: list[Attendee]) -> float:
    """Mean pairwise Jaccard on interests — want common ground."""
    pairs = list(combinations(table, 2))
    if not pairs:
        return 0.0
    return sum(_jaccard(set(x.interests), set(y.interests)) for x, y in pairs) / len(pairs)


def personality_balance(table: list[Attendee], target_variance: float) -> float:
    """Energy variance near the target beats all-loud or all-quiet. Peaks at
    the target and falls off smoothly either side."""
    energies = [a.energy for a in table]
    if len(energies) < 2:
        return 0.5
    var = pvariance(energies)
    # Gaussian-ish falloff around the target variance
    return max(0.0, 1.0 - abs(var - target_variance) / (target_variance + 0.5))


def depth_alignment(table: list[Attendee]) -> float:
    """Low variance on depth preference → the table wants the same register."""
    depths = [a.depth for a in table]
    if len(depths) < 2:
        return 0.5
    return max(0.0, 1.0 - pvariance(depths))


def humor_compat(table: list[Attendee]) -> float:
    """Overlap in humor styles across the table."""
    pairs = list(combinations(table, 2))
    if not pairs:
        return 0.0
    return sum(_jaccard(set(x.humor_styles), set(y.humor_styles)) for x, y in pairs) / len(pairs)


def novelty_bonus(table: list[Attendee]) -> float:
    """Small reward for 1-2 wildcards (high novelty) - a spark, not chaos."""
    wildcards = sum(1 for a in table if a.novelty >= 0.5)
    if wildcards in (1, 2):
        return 1.0
    if wildcards == 0:
        return 0.3
    return max(0.0, 1.0 - 0.25 * (wildcards - 2))


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return float(dot / (na * nb))


def embedding_affinity(table: list[Attendee]) -> float | None:
    """Mean pairwise cosine on profile embeddings — None (skipped) if any member
    lacks an embedding (auto-skip when the embedder is unset, plan §7.2)."""
    if any(a.embedding is None for a in table):
        return None
    pairs = list(combinations(table, 2))
    if not pairs:
        return None
    raw = sum(_cosine(x.embedding or [], y.embedding or []) for x, y in pairs) / len(pairs)
    return (raw + 1.0) / 2.0  # cosine [-1,1] → [0,1]


def score_table(table: list[Attendee], params: MatchParams) -> tuple[float, dict[str, Any]]:
    components: dict[str, float] = {
        "interest_overlap": interest_overlap(table),
        "personality_balance": personality_balance(table, params.target_energy_variance),
        "depth_alignment": depth_alignment(table),
        "humor_compat": humor_compat(table),
        "novelty_bonus": novelty_bonus(table),
    }
    affinity = embedding_affinity(table)
    if affinity is not None:
        components["embedding_affinity"] = affinity

    total_weight = sum(params.weights[k] for k in components)
    if total_weight == 0:
        return 0.0, {"components": components}
    score = sum(components[k] * params.weights[k] for k in components) / total_weight

    return score, {"components": components, "weighted_score": score}
