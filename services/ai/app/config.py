"""All AI choices are configuration, never code (IMPLEMENTATION_PLAN.md §4).

Model names, providers, vector store, dims — env-driven only. Swapping any of
them must require zero code changes. The stack must boot (and matching must
work) with LLM_MODEL / EMBEDDING_MODEL unset.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Inter-service auth: api → ai bearer token. The ai service is never public.
    internal_api_token: str = "dev-internal-token-change-me"

    # LLM
    llm_provider: Literal["ollama", "openai", "anthropic"] = "ollama"
    ollama_base_url: str = "http://ollama:11434"
    llm_model: str = ""  # operator sets this — empty means "not configured"
    llm_temperature: float = 0.7

    # Embeddings
    embedding_provider: Literal["ollama", "openai"] = "ollama"
    embedding_model: str = ""  # operator sets this — empty means "not configured"
    embedding_dim: int = 768

    # Vector / document stores
    vector_store: Literal["qdrant", "pgvector"] = "qdrant"
    qdrant_url: str = "http://qdrant:6333"
    qdrant_collection: str = "mulaqat_decks"
    document_store: Literal["postgres"] = "postgres"
    database_url: str = "postgresql://mulaqat:mulaqat@postgres:5432/mulaqat"

    # Matching & evals
    matching_algo_version: str = "v1"
    eval_pass_threshold: float = 0.90

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_model)

    @property
    def embeddings_configured(self) -> bool:
        return bool(self.embedding_model)


@lru_cache
def get_settings() -> Settings:
    return Settings()
