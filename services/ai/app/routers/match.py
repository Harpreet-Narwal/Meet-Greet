from fastapi import APIRouter, Depends

from app.deps import require_internal_token
from app.matching import MatchRequest, MatchResponse, compose_tables

router = APIRouter(prefix="/match", dependencies=[Depends(require_internal_token)])


@router.post("/compose")
async def compose(body: MatchRequest) -> MatchResponse:
    """Compose tables. Deterministic — works with zero LLM/embedder configured."""
    return compose_tables(body)
