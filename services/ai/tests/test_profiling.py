from fastapi.testclient import TestClient

from app.profiling import ProfileRequest, compute_profile
from app.profiling.archetypes import pick_archetype
from app.profiling.models import AnswerWeights


def _request(
    weights: list[dict[str, float]],
    humor: list[list[str]] | None = None,
    trait_max: dict[str, float] | None = None,
    first_name: str | None = None,
) -> ProfileRequest:
    humor = humor or [[] for _ in weights]
    return ProfileRequest(
        quiz_version="v1",
        first_name=first_name,
        answers=[
            AnswerWeights(question_id=f"q{i}", weights=w, humor_styles=h)
            for i, (w, h) in enumerate(zip(weights, humor, strict=True))
        ],
        trait_max=trait_max or {"energy": 2.0, "depth": 2.0, "novelty": 2.0, "structure": 2.0},
    )


def test_traits_are_normalized_and_clamped() -> None:
    profile = compute_profile(
        _request([{"energy": 1.0}, {"energy": 1.0}, {"energy": 5.0}])  # overshoot → clamp
    )
    assert profile.traits.energy == 1.0
    assert profile.traits.depth == 0.0


def test_deterministic_same_input_same_output() -> None:
    request = _request([{"energy": 0.8, "depth": 0.6}, {"novelty": -0.4}])
    assert compute_profile(request) == compute_profile(request)


def test_zero_trait_max_never_divides_by_zero() -> None:
    profile = compute_profile(_request([{"energy": 1.0}], trait_max={"energy": 0.0}))
    assert profile.traits.energy == 0.0


def test_archetype_grid_matches_seed_content() -> None:
    # (energy, depth, novelty, structure) → expected archetype
    cases = [
        ((0.8, 0.6, 0.0, 0.0), "Warm Firecracker"),
        ((0.8, 0.0, 0.2, 0.0), "Social Alchemist"),
        ((0.8, 0.0, -0.2, 0.0), "Playful Spark"),
        ((0.0, 0.6, -0.2, 0.0), "Cozy Philosopher"),
        ((0.0, 0.6, 0.2, 0.0), "Curious Wanderer"),
        ((0.0, 0.0, 0.0, 0.5), "Steady Anchor"),
        ((0.0, 0.0, 0.5, 0.0), "Gentle Rebel"),
        ((-0.5, -0.5, -0.5, -0.5), "Quiet Observer"),
    ]
    for (energy, depth, novelty, structure), expected in cases:
        assert pick_archetype(energy, depth, novelty, structure).name == expected, expected


def test_humor_styles_ranked_by_frequency() -> None:
    profile = compute_profile(
        _request(
            [{}, {}, {}],
            humor=[["dry"], ["dry", "goofy"], ["observational"]],
        )
    )
    assert profile.humor_styles[0] == "dry"
    assert set(profile.humor_styles) == {"dry", "goofy", "observational"}


def test_blurb_personalized_with_first_name() -> None:
    profile = compute_profile(_request([{"energy": 2.0, "depth": 2.0}], first_name="Aisha"))
    assert profile.blurb.startswith("Aisha, ")


def test_compute_endpoint_requires_internal_token(client: TestClient) -> None:
    response = client.post(
        "/profile/compute",
        json={"quiz_version": "v1", "answers": [{"question_id": "q1"}], "trait_max": {}},
    )
    assert response.status_code == 401


def test_compute_endpoint_works_without_llm(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Matching/profiling must work with zero models configured (plan §4)."""
    response = client.post(
        "/profile/compute",
        json={
            "quiz_version": "v1",
            "first_name": "Rohan",
            "answers": [{"question_id": "q1", "weights": {"energy": 1.0}, "humor_styles": ["dry"]}],
            "trait_max": {"energy": 1.0, "depth": 1.0, "novelty": 1.0, "structure": 1.0},
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["traits"]["energy"] == 1.0
    assert body["archetype"] == "Social Alchemist"
    assert body["blurb"].startswith("Rohan, ")
