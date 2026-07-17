"""Matching engine (plan §7.2). Greedy seeding (most-constrained-first) then
hill-climbing swaps until no swap improves total score. Seeded RNG →
reproducible. Must NOT require an LLM.
"""

import random
from statistics import mean
from typing import Any

from app.matching.constraints import table_valid, violation_reasons
from app.matching.models import (
    Attendee,
    MatchParams,
    MatchRequest,
    MatchResponse,
    TableResult,
)
from app.matching.scoring import score_table

ALGO_VERSION = "v1"


def _num_tables(n: int, params: MatchParams) -> int:
    """Choose a table count so every table lands in [min_table_size, table_size]."""
    size = params.table_size
    tables = max(1, round(n / size))
    # grow until no table would exceed table_size
    while tables * size < n:
        tables += 1
    # shrink while every table still meets the minimum
    while tables > 1 and (n / (tables - 1)) <= size:
        tables -= 1
    return max(1, tables)


def _language_groups(attendees: list[Attendee]) -> list[list[Attendee]]:
    """Partition into groups that each share a common language, so every table
    formed inside a group satisfies the language constraint. English-common
    events collapse to one group; islands separate out."""
    groups: list[tuple[set[str], list[Attendee]]] = []
    # place the most-linguistically-flexible last so islands seed their own group
    ordered = sorted(attendees, key=lambda a: (len(a.languages), a.user_id))
    for attendee in ordered:
        langs = set(attendee.languages)
        placed = False
        for common, members in groups:
            if not langs:
                continue
            new_common = common & langs
            if new_common:
                common.clear()
                common.update(new_common)
                members.append(attendee)
                placed = True
                break
        if not placed:
            groups.append((set(langs), [attendee]))
    return [members for _common, members in groups]


def _chunk_by_age(
    group: list[Attendee], params: MatchParams, blocked: set[frozenset[str]]
) -> list[list[Attendee]]:
    """Age-sorted, validity-checked greedy windowing. Walk ages ascending; add
    to the current table only while it stays valid and under table_size, else
    start a new table. Every emitted table is valid by construction. A trailing
    table below min_table_size is redistributed into earlier valid tables."""
    if not group:
        return []
    ordered = sorted(group, key=lambda a: (a.age if a.age is not None else 0, a.user_id))
    tables: list[list[Attendee]] = []
    current: list[Attendee] = []
    for attendee in ordered:
        if (
            current
            and len(current) < params.table_size
            and table_valid([*current, attendee], params, blocked)
        ):
            current.append(attendee)
        else:
            if current:
                tables.append(current)
            current = [attendee]
    if current:
        tables.append(current)

    # Redistribute an undersized trailing table into earlier valid tables.
    if len(tables) > 1 and len(tables[-1]) < params.min_table_size:
        leftovers = tables.pop()
        for attendee in leftovers:
            placed = False
            for table in sorted(tables, key=len):
                if len(table) < params.table_size and table_valid(
                    [*table, attendee], params, blocked
                ):
                    table.append(attendee)
                    placed = True
                    break
            if not placed:
                # no valid home — keep it as its own (small) table rather than drop
                tables.append([attendee])
    return tables


def _repair_blocked(
    tables: list[list[Attendee]],
    params: MatchParams,
    blocked: set[frozenset[str]],
) -> list[list[Attendee]]:
    """Swap members to separate blocked pairs while preserving validity."""
    if not blocked:
        return tables
    for _pass in range(len(tables) * 4):
        moved = False
        for ti, table in enumerate(tables):
            ids = [a.user_id for a in table]
            bad = None
            for i, x in enumerate(ids):
                for y in ids[i + 1 :]:
                    if frozenset((x, y)) in blocked:
                        bad = y
                        break
                if bad:
                    break
            if bad is None:
                continue
            # try to swap the offending member into another table validly
            offender = next(a for a in table if a.user_id == bad)
            for tj, other in enumerate(tables):
                if tj == ti:
                    continue
                for cand in other:
                    new_i = [a for a in table if a.user_id != bad] + [cand]
                    new_j = [a for a in other if a.user_id != cand.user_id] + [offender]
                    if table_valid(new_i, params, blocked) and table_valid(new_j, params, blocked):
                        tables[ti], tables[tj] = new_i, new_j
                        moved = True
                        break
                if moved:
                    break
        if not moved:
            break
    return tables


def _seed_tables(
    attendees: list[Attendee],
    params: MatchParams,
    blocked: set[frozenset[str]],
) -> list[list[Attendee]]:
    """Constraint-guaranteeing seed: language-group → age-sorted validity-checked
    chunking → blocked-pair repair. Every emitted table is valid by construction
    when the event is feasible."""
    tables: list[list[Attendee]] = []
    for group in _language_groups(attendees):
        tables.extend(_chunk_by_age(group, params, blocked))
    tables = [t for t in tables if t]
    return _repair_blocked(tables, params, blocked)


def _total_score(tables: list[list[Attendee]], params: MatchParams) -> float:
    scores = [score_table(t, params)[0] for t in tables if t]
    return mean(scores) if scores else 0.0


def _best_swap(
    tables: list[list[Attendee]],
    params: MatchParams,
    blocked: set[frozenset[str]],
    order: list[int],
    best: float,
) -> tuple[int, int, list[Attendee], list[Attendee]] | None:
    """Find the single validity-preserving cross-table member swap that most
    improves the mean score. Returns (ti, tj, new_i, new_j) or None. Read-only —
    never mutates `tables` (mutating mid-scan corrupts the assignment)."""
    best_move: tuple[int, int, list[Attendee], list[Attendee]] | None = None
    for ti in order:
        for tj in order:
            if ti >= tj:
                continue
            for i in range(len(tables[ti])):
                for j in range(len(tables[tj])):
                    a, b = tables[ti][i], tables[tj][j]
                    new_i = [*tables[ti][:i], b, *tables[ti][i + 1 :]]
                    new_j = [*tables[tj][:j], a, *tables[tj][j + 1 :]]
                    if not table_valid(new_i, params, blocked) or not table_valid(
                        new_j, params, blocked
                    ):
                        continue
                    trial = list(tables)
                    trial[ti], trial[tj] = new_i, new_j
                    gain = _total_score(trial, params)
                    if gain > best + 1e-9:
                        best = gain
                        best_move = (ti, tj, new_i, new_j)
    return best_move


def _hill_climb(
    tables: list[list[Attendee]],
    params: MatchParams,
    blocked: set[frozenset[str]],
    rng: random.Random,
) -> list[list[Attendee]]:
    """Steepest-ascent swaps: each iteration find the best validity-preserving
    swap, apply it, rescan — until none improves. Seeded RNG for reproducible
    scan order. Validity-preserving swaps never change the multiset of
    attendees, so no member is duplicated or lost."""
    order = list(range(len(tables)))
    rng.shuffle(order)
    for _iteration in range(params.max_iterations):
        best = _total_score(tables, params)
        move = _best_swap(tables, params, blocked, order, best)
        if move is None:
            break
        ti, tj, new_i, new_j = move
        tables[ti], tables[tj] = new_i, new_j
    return tables


def _explain(table: list[Attendee], params: MatchParams) -> dict[str, Any]:
    score, detail = score_table(table, params)
    # top shared interests across the table
    interest_counts: dict[str, int] = {}
    for a in table:
        for interest in a.interests:
            interest_counts[interest] = interest_counts.get(interest, 0) + 1
    shared = sorted(
        (i for i, c in interest_counts.items() if c >= 2),
        key=lambda i: (-interest_counts[i], i),
    )[:3]
    common_langs = (
        set.intersection(*[set(a.languages) for a in table if a.languages])
        if all(a.languages for a in table)
        else set()
    )
    return {
        "score": round(score, 4),
        "components": {k: round(v, 4) for k, v in detail["components"].items()},
        "top_shared_interests": shared,
        "common_languages": sorted(common_langs),
        "size": len(table),
    }


def compose_tables(request: MatchRequest) -> MatchResponse:
    params = request.params
    rng = random.Random(params.seed)
    attendees = list(request.attendees)
    # women-only tables only seat women (the api sends only women; defensive here
    # so a stray non-woman can never land at a women-only table).
    if params.women_only:
        attendees = [a for a in attendees if a.gender == "woman"]
    blocked = {frozenset(pair) for pair in request.blocked_pairs}

    tables = _seed_tables(attendees, params, blocked)
    tables = _hill_climb(tables, params, blocked, rng)

    non_empty = [t for t in tables if t]
    results: list[TableResult] = []
    violations = 0
    for number, table in enumerate(non_empty, start=1):
        explain = _explain(table, params)
        reasons = violation_reasons(table, params, blocked)
        if reasons:
            violations += 1
            explain["violations"] = reasons
        results.append(
            TableResult(
                table_number=number,
                user_ids=[a.user_id for a in table],
                score=explain["score"],
                explain=explain,
            )
        )

    table_scores = [r.score for r in results]
    summary = {
        "table_count": len(results),
        "attendee_count": len(attendees),
        "mean_table_score": round(mean(table_scores), 4) if table_scores else 0.0,
        "min_table_score": round(min(table_scores), 4) if table_scores else 0.0,
        "hard_constraint_violations": violations,
    }
    return MatchResponse(algo_version=ALGO_VERSION, tables=results, score_summary=summary)
