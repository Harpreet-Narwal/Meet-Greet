from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.deps import SettingsDep, require_internal_token
from app.providers import get_embedding_provider

router = APIRouter(dependencies=[Depends(require_internal_token)])


class EmbeddingsRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=256)


class EmbeddingsResponse(BaseModel):
    model: str
    dim: int
    vectors: list[list[float]]


@router.post("/embeddings")
async def embeddings(body: EmbeddingsRequest, settings: SettingsDep) -> EmbeddingsResponse:
    """Thin passthrough to the configured embedder (used for profile embeddings)."""
    provider = get_embedding_provider(settings)
    vectors = await provider.embed(body.texts)
    return EmbeddingsResponse(model=provider.model, dim=provider.dim, vectors=vectors)
