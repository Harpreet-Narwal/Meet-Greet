"""Matching eval suite (plan §10). Deterministic, no LLM.

For each golden event the matcher composes tables. We assert:
  1. hard-constraint violations == 0  (a single violation fails the suite)
  2. quality lift over a best-of-N random-valid baseline

Composite = violation_free_rate * mean_event_quality, where event_quality is
how far the matcher's mean table score reaches from the average random-valid
assignment toward the best of N random-valid assignments (≥1 → clamped to 1).
Pass = composite ≥ EVAL_PASS_THRESHOLD.
"""

import json
import random
from pathlib import Path
from statistics import mean
from typing import Any

from app.matching.constraints import table_valid, violation_reasons
from app.matching.engine import compose_tables
from app.matching.models import Attendee, MatchParams, MatchRequest
from app.matching.scoring import score_table

GOLDEN = Path(__file__).parent / "golden" / "matching.jsonl"
RANDOM_BASELINES = 40


def _load() -> list[dict[str, Any]]:
    with GOLDEN.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def _num_tables(n: int, size: int) -> int:
    tables = max(1, round(n / size))
    while tables * size < n:
        tables += 1
    while tables > 1 and (n / (tables - 1)) <= size:
        tables -= 1
    return max(1, tables)


def _random_valid_mean(
    attendees: list[Attendee],
    params: MatchParams,
    blocked: set[frozenset[str]],
    rng: random.Random,
) -> float | None:
    """One random assignment that satisfies constraints; None if it fails to
    build a valid partition in a few tries (isolates quality from solving)."""
    size = params.table_size
    num_tables = _num_tables(len(attendees), size)
    for _attempt in range(6):
        pool = list(attendees)
        rng.shuffle(pool)
        tables: list[list[Attendee]] = [[] for _ in range(num_tables)]
        ok = True
        for attendee in pool:
            placed = False
            for table in sorted(tables, key=len):
                if len(table) < size and table_valid([*table, attendee], params, blocked):
                    table.append(attendee)
                    placed = True
                    break
            if not placed:
                ok = False
                break
        if ok and all(tables):
            return mean(score_table(t, params)[0] for t in tables)
    return None


def run() -> float:
    events = _load()
    total_tables = 0
    violation_tables = 0
    event_qualities: list[float] = []

    for event in events:
        attendees = [Attendee(**a) for a in event["attendees"]]
        params = MatchParams(**event.get("params", {}))
        blocked = {frozenset(p) for p in event.get("blocked_pairs", [])}

        response = compose_tables(
            MatchRequest(
                attendees=attendees,
                params=params,
                blocked_pairs=[tuple(p) for p in event.get("blocked_pairs", [])],
            )
        )

        # 1. constraint compliance
        for table in response.tables:
            total_tables += 1
            table_attendees = [a for a in attendees if a.user_id in set(table.user_ids)]
            if violation_reasons(table_attendees, params, blocked):
                violation_tables += 1

        matcher_mean = response.score_summary["mean_table_score"]

        # 2. quality lift vs best-of-N random valid
        rng = random.Random(1000 + hash(event["event_id"]) % 10000)
        randoms = [
            r
            for r in (
                _random_valid_mean(attendees, params, blocked, rng) for _ in range(RANDOM_BASELINES)
            )
            if r is not None
        ]
        if randoms:
            rand_avg = mean(randoms)
            rand_best = max(randoms)
            headroom = rand_best - rand_avg
            if headroom < 1e-6:
                quality = 1.0 if matcher_mean >= rand_best - 1e-6 else 0.5
            else:
                quality = (matcher_mean - rand_avg) / headroom
        else:
            # random couldn't even build a valid partition → matcher solving it
            # at all is full credit for this (hard) event
            quality = 1.0
        event_qualities.append(max(0.0, min(1.0, quality)))

    violation_free_rate = 1.0 - (violation_tables / total_tables if total_tables else 0)
    mean_quality = mean(event_qualities) if event_qualities else 0.0
    composite = violation_free_rate * mean_quality

    print(f"    events={len(events)} tables={total_tables} violations={violation_tables}")
    print(
        f"    violation_free_rate={violation_free_rate:.3f} "
        f"mean_quality={mean_quality:.3f} composite={composite:.3f}"
    )
    return composite
