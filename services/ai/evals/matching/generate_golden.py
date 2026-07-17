"""Generate the matching golden dataset — 66 synthetic events, **feasible by
construction** (built from valid seed-tables so a valid grouping always
exists), covering varied sizes, skewed genders, language islands, blocked
pairs and edge cases (plan §10). Deterministic (seeded).

Run: `python -m evals.matching.generate_golden` → writes golden/matching.jsonl.
"""

import json
import random
from pathlib import Path
from typing import Any

INTERESTS = [
    "Food & cooking",
    "Cricket/sports",
    "Films & series",
    "Music & gigs",
    "Startups & tech",
    "Books",
    "Travel",
    "Fitness & running",
    "Art & design",
    "Gaming",
    "Psychology & people",
    "Finance & investing",
    "Comedy & standup",
    "Spirituality",
    "Fashion",
    "Photography",
]
HUMOR = ["goofy", "dry", "observational", "punny"]
DIETARY = ["veg", "nonveg", "nonveg", "eggetarian", "veg", "jain", "vegan"]
# clusters that do NOT all share a common tongue → real language islands
LANG_CLUSTERS = [
    ["English", "Hindi"],
    ["English", "Kannada"],
    ["Tamil", "Telugu"],
    ["Hindi", "Marathi"],
    ["Bengali", "English"],
]


def _attendee(
    rng: random.Random, uid: str, languages: list[str], gender: str, age: int
) -> dict[str, Any]:
    return {
        "user_id": uid,
        "energy": round(rng.uniform(-1, 1), 2),
        "depth": round(rng.uniform(-1, 1), 2),
        "novelty": round(rng.uniform(-1, 1), 2),
        "structure": round(rng.uniform(-1, 1), 2),
        "humor_styles": rng.sample(HUMOR, k=rng.randint(1, 2)),
        "interests": rng.sample(INTERESTS, k=rng.randint(3, 6)),
        "languages": languages,
        "age": age,
        "gender": gender,
        "dietary": rng.choice(DIETARY),
        "intent": rng.choice(["friends_only", "open_to_dating"]),
    }


def _seed_table(
    rng: random.Random, event_id: str, start_idx: int, size: int, kind: str
) -> list[dict[str, Any]]:
    """A single VALID table: one common language, ages within an 8-year window,
    all-women when women_only. Guarantees a valid solution exists."""
    if kind == "language_islands":
        langs = rng.choice(LANG_CLUSTERS)
    else:
        # everyone shares English plus a regional tongue
        langs = sorted({"English", *rng.choice(LANG_CLUSTERS)})
    age_base = rng.randint(23, 32)  # window [age_base, age_base+7] → spread ≤ 7
    members = []
    for k in range(size):
        if kind == "women_only":
            gender = "woman"
        elif kind == "skewed_gender":
            gender = "woman" if rng.random() < 0.75 else "man"
        else:
            gender = rng.choice(["woman", "man", "man", "nonbinary"])
        age = age_base + rng.randint(0, 7)
        members.append(_attendee(rng, f"{event_id}-u{start_idx + k}", langs, gender, age))
    return members


def _event(rng: random.Random, event_id: str, kind: str) -> dict[str, Any]:
    table_size = 6
    if kind == "small":
        n_tables = rng.randint(1, 2)
    elif kind == "large":
        n_tables = rng.randint(4, 6)
    else:
        n_tables = rng.randint(2, 4)

    attendees: list[dict[str, Any]] = []
    for _t in range(n_tables):
        # some tables land at the minimum size (5) to exercise 5-6 tables
        size = table_size if rng.random() < 0.7 else 5
        attendees.extend(_seed_table(rng, event_id, len(attendees), size, kind))

    n = len(attendees)
    blocked_pairs: list[list[str]] = []
    if kind == "blocked_pairs" and n_tables >= 2:
        # block pairs across the seed tables so the seed grouping stays valid
        for _ in range(rng.randint(1, 3)):
            a, b = rng.sample(range(n), 2)
            blocked_pairs.append([f"{event_id}-u{a}", f"{event_id}-u{b}"])

    return {
        "event_id": event_id,
        "kind": kind,
        "attendees": attendees,
        "params": {"table_size": table_size, "women_only": kind == "women_only", "seed": 42},
        "blocked_pairs": blocked_pairs,
    }


def build(count: int = 66) -> list[dict[str, Any]]:
    rng = random.Random(20260718)
    kinds = [
        "standard",
        "standard",
        "standard",
        "small",
        "large",
        "skewed_gender",
        "women_only",
        "language_islands",
        "blocked_pairs",
    ]
    return [_event(rng, f"evt{i:03d}", kinds[i % len(kinds)]) for i in range(count)]


def main() -> None:
    out = Path(__file__).parent / "golden" / "matching.jsonl"
    events = build()
    with out.open("w") as f:
        for event in events:
            f.write(json.dumps(event) + "\n")
    print(f"wrote {len(events)} events → {out}")


if __name__ == "__main__":
    main()
