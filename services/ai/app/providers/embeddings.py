"""Embedding provider abstraction — same rules as chat: env-selected, never hardcoded."""

from typing import Protocol

import httpx

from app.config import Settings
from app.providers.errors import ProviderNotConfiguredError


class EmbeddingProvider(Protocol):
    model: str
    dim: int

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one vector per input text."""
        ...


class OllamaEmbeddings:
    def __init__(self, base_url: str, model: str, dim: int) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.dim = dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=120.0) as client:
            response = await client.post(
                "/api/embed",
                json={"model": self.model, "input": texts},
            )
            response.raise_for_status()
            vectors: list[list[float]] = response.json()["embeddings"]
            return vectors


class OpenAIEmbeddings:
    """Stub — wire when an operator sets EMBEDDING_PROVIDER=openai."""

    def __init__(self, model: str, dim: int) -> None:
        self.model = model
        self.dim = dim

    async def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError(
            "openai embedding provider is a stub — use EMBEDDING_PROVIDER=ollama for local dev"
        )


def get_embedding_provider(settings: Settings) -> EmbeddingProvider:
    if not settings.embeddings_configured:
        raise ProviderNotConfiguredError("EMBEDDING_MODEL not configured")
    if settings.embedding_provider == "ollama":
        return OllamaEmbeddings(
            settings.ollama_base_url, settings.embedding_model, settings.embedding_dim
        )
    return OpenAIEmbeddings(settings.embedding_model, settings.embedding_dim)
