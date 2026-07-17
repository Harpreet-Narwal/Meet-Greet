from typing import Any, Literal

from pydantic import BaseModel, Field


class Attendee(BaseModel):
    user_id: str
    # Personality traits, normalized to [-1, 1]
    energy: float = 0.0
    depth: float = 0.0
    novelty: float = 0.0
    structure: float = 0.0
    humor_styles: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    age: int | None = None
    gender: Literal["woman", "man", "nonbinary", "prefer_not"] | None = None
    dietary: Literal["veg", "nonveg", "jain", "vegan", "eggetarian"] | None = None
    intent: Literal["friends_only", "open_to_dating"] | None = None
    # Optional profile embedding for embedding_affinity (auto-skipped if absent)
    embedding: list[float] | None = None


class MatchParams(BaseModel):
    table_size: int = 6
    min_table_size: int = 5
    women_only: bool = False
    # Max age spread per table (± half from median)
    max_age_spread: int = 8
    # Target energy variance for a lively mix (not all-loud / all-quiet)
    target_energy_variance: float = 0.35
    seed: int = 42
    max_iterations: int = 500
    # Scoring weights (config, not code — the api forwards event/config overrides)
    weights: dict[str, float] = Field(
        default_factory=lambda: {
            "interest_overlap": 1.0,
            "personality_balance": 0.8,
            "depth_alignment": 0.6,
            "humor_compat": 0.5,
            "novelty_bonus": 0.3,
            "embedding_affinity": 0.4,
        }
    )


class MatchRequest(BaseModel):
    event_id: str | None = None
    attendees: list[Attendee] = Field(min_length=1)
    params: MatchParams = Field(default_factory=MatchParams)
    # Pairs that must never share a table (blocks); "met before, rated low" → hard
    blocked_pairs: list[tuple[str, str]] = Field(default_factory=list)


class TableResult(BaseModel):
    table_number: int
    user_ids: list[str]
    score: float
    explain: dict[str, Any]


class MatchResponse(BaseModel):
    algo_version: str
    tables: list[TableResult]
    score_summary: dict[str, Any]
