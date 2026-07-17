"""Hard constraints (plan §7.2). A table violating any of these is invalid and
must never be emitted. Pure predicate functions — no side effects.
"""

from statistics import median

from app.matching.models import Attendee, MatchParams


def _blocked(user_ids: list[str], blocked_pairs: set[frozenset[str]]) -> bool:
    for i, a in enumerate(user_ids):
        for b in user_ids[i + 1 :]:
            if frozenset((a, b)) in blocked_pairs:
                return True
    return False


def age_band_ok(table: list[Attendee], params: MatchParams) -> bool:
    ages = [a.age for a in table if a.age is not None]
    if len(ages) < 2:
        return True
    spread = max(ages) - min(ages)
    if spread > params.max_age_spread:
        return False
    # ±(spread/2) from the median
    med = median(ages)
    half = params.max_age_spread / 2
    return all(abs(age - med) <= half for age in ages)


def language_ok(table: list[Attendee]) -> bool:
    """Every member shares ≥1 language with the whole table (a common tongue)."""
    lang_sets = [set(a.languages) for a in table if a.languages]
    if len(lang_sets) < len(table):
        # someone has no languages listed → cannot guarantee a shared tongue
        return len(lang_sets) == 0
    common = set.intersection(*lang_sets) if lang_sets else set()
    return len(common) >= 1


def gender_ok(table: list[Attendee], params: MatchParams) -> bool:
    if params.women_only:
        return all(a.gender == "woman" for a in table)
    return True


def blocked_ok(table: list[Attendee], blocked_pairs: set[frozenset[str]]) -> bool:
    return not _blocked([a.user_id for a in table], blocked_pairs)


def table_valid(
    table: list[Attendee],
    params: MatchParams,
    blocked_pairs: set[frozenset[str]],
) -> bool:
    return (
        age_band_ok(table, params)
        and language_ok(table)
        and gender_ok(table, params)
        and blocked_ok(table, blocked_pairs)
    )


def violation_reasons(
    table: list[Attendee],
    params: MatchParams,
    blocked_pairs: set[frozenset[str]],
) -> list[str]:
    reasons: list[str] = []
    if not age_band_ok(table, params):
        reasons.append("age_band")
    if not language_ok(table):
        reasons.append("no_shared_language")
    if not gender_ok(table, params):
        reasons.append("gender")
    if not blocked_ok(table, blocked_pairs):
        reasons.append("blocked_pair")
    return reasons
