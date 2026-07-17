from typing import Any

from fastapi import APIRouter

from app.deps import SettingsDep

router = APIRouter()


@router.get("/health")
async def health(settings: SettingsDep) -> dict[str, Any]:
    """Liveness + configuration snapshot. Must respond even with no models configured."""
    return {
        "status": "ok",
        "service": "ai",
        "llm_configured": settings.llm_configured,
        "embeddings_configured": settings.embeddings_configured,
        "vector_store": settings.vector_store,
        "models": {
            "llm": settings.llm_model or None,
            "embedding": settings.embedding_model or None,
        },
        "matching_algo_version": settings.matching_algo_version,
    }
