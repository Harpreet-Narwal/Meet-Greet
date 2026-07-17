from fastapi import APIRouter, Depends

from app.deps import require_internal_token
from app.profiling import ProfileRequest, ProfileResponse, compute_profile

router = APIRouter(prefix="/profile", dependencies=[Depends(require_internal_token)])


@router.post("/compute")
async def compute(body: ProfileRequest) -> ProfileResponse:
    """Deterministic trait scoring + archetype. Works with zero LLM configured."""
    return compute_profile(body)
