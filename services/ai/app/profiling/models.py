from pydantic import BaseModel, Field

TRAITS = ("energy", "depth", "novelty", "structure")


class AnswerWeights(BaseModel):
    question_id: str
    weights: dict[str, float] = Field(default_factory=dict)
    humor_styles: list[str] = Field(default_factory=list)


class ProfileRequest(BaseModel):
    quiz_version: str
    first_name: str | None = None
    answers: list[AnswerWeights] = Field(min_length=1)
    # Per-trait normalization ceiling, derived from the quiz definition by the api.
    trait_max: dict[str, float] = Field(default_factory=dict)


class Traits(BaseModel):
    energy: float
    depth: float
    novelty: float
    structure: float


class ProfileResponse(BaseModel):
    traits: Traits
    humor_styles: list[str]
    archetype: str
    archetype_emoji: str
    blurb: str
