from collections import Counter

from fastapi.testclient import TestClient

from app.matching import Attendee, MatchParams, MatchRequest, compose_tables
from app.matching.constraints import violation_reasons


def _attendee(uid: str, **kw: object) -> Attendee:
    base: dict[str, object] = {
        "user_id": uid,
        "languages": ["English"],
        "age": 28,
        "interests": ["Books", "Travel"],
        "humor_styles": ["dry"],
    }
    base.update(kw)
    return Attendee(**base)  # type: ignore[arg-type]


def test_every_attendee_placed_exactly_once() -> None:
    attendees = [_attendee(f"u{i}", age=25 + (i % 6)) for i in range(18)]
    result = compose_tables(MatchRequest(attendees=attendees))
    placed = [uid for t in result.tables for uid in t.user_ids]
    assert sorted(placed) == sorted(a.user_id for a in attendees)
    assert max(Counter(placed).values()) == 1  # no duplicates


def test_tables_respect_size_bounds() -> None:
    attendees = [_attendee(f"u{i}", age=26 + (i % 5)) for i in range(17)]
    result = compose_tables(MatchRequest(attendees=attendees))
    for table in result.tables:
        assert 1 <= len(table.user_ids) <= 6


def test_age_band_never_violated() -> None:
    # a wide age range must be split into ≤8-spread, ±4-from-median tables
    attendees = [_attendee(f"u{i}", age=22 + i) for i in range(18)]  # 22..39
    result = compose_tables(MatchRequest(attendees=attendees))
    by_id = {a.user_id: a for a in attendees}
    for table in result.tables:
        members = [by_id[uid] for uid in table.user_ids]
        assert violation_reasons(members, MatchParams(), set()) == []


def test_language_islands_never_share_a_tongueless_table() -> None:
    tamil = [_attendee(f"t{i}", languages=["Tamil", "Telugu"], age=27) for i in range(6)]
    hindi = [_attendee(f"h{i}", languages=["Hindi", "Marathi"], age=27) for i in range(6)]
    result = compose_tables(MatchRequest(attendees=[*tamil, *hindi]))
    by_id = {a.user_id: a for a in [*tamil, *hindi]}
    for table in result.tables:
        members = [by_id[uid] for uid in table.user_ids]
        common = set.intersection(*[set(m.languages) for m in members])
        assert len(common) >= 1


def test_blocked_pairs_never_seated_together() -> None:
    attendees = [_attendee(f"u{i}", age=27) for i in range(12)]
    result = compose_tables(
        MatchRequest(attendees=attendees, blocked_pairs=[("u0", "u1"), ("u2", "u3")])
    )
    for table in result.tables:
        ids = set(table.user_ids)
        assert not ({"u0", "u1"} <= ids)
        assert not ({"u2", "u3"} <= ids)


def test_women_only_tables_are_all_women() -> None:
    women = [_attendee(f"w{i}", gender="woman", age=27) for i in range(6)]
    men = [_attendee(f"m{i}", gender="man", age=27) for i in range(6)]
    result = compose_tables(
        MatchRequest(attendees=[*women, *men], params=MatchParams(women_only=True))
    )
    by_id = {a.user_id: a for a in [*women, *men]}
    # women-only: only women get seated at valid tables
    for table in result.tables:
        for uid in table.user_ids:
            assert by_id[uid].gender == "woman"


def test_deterministic_same_seed_same_tables() -> None:
    attendees = [_attendee(f"u{i}", age=25 + (i % 6), energy=(i % 3) - 1) for i in range(18)]
    r1 = compose_tables(MatchRequest(attendees=attendees))
    r2 = compose_tables(MatchRequest(attendees=attendees))
    assert [t.user_ids for t in r1.tables] == [t.user_ids for t in r2.tables]


def test_works_without_llm_or_embeddings() -> None:
    # matching is pure math — no embeddings provided, engine still runs
    attendees = [_attendee(f"u{i}", age=27) for i in range(6)]
    result = compose_tables(MatchRequest(attendees=attendees))
    assert result.score_summary["hard_constraint_violations"] == 0
    assert result.tables[0].explain["score"] >= 0


def test_match_endpoint_requires_internal_token(client: TestClient) -> None:
    response = client.post("/match/compose", json={"attendees": [{"user_id": "u1"}]})
    assert response.status_code == 401


def test_match_endpoint_composes(client: TestClient, auth_headers: dict[str, str]) -> None:
    payload = {
        "attendees": [{"user_id": f"u{i}", "languages": ["English"], "age": 27} for i in range(12)]
    }
    response = client.post("/match/compose", json=payload, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["algo_version"] == "v1"
    assert body["score_summary"]["hard_constraint_violations"] == 0
    assert sum(len(t["user_ids"]) for t in body["tables"]) == 12
