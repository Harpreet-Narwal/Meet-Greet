import pytest

from app.config import Settings, get_settings
from app.providers import ProviderNotConfiguredError, get_chat_provider, get_embedding_provider
from app.providers.embeddings import OllamaEmbeddings
from app.providers.llm import OllamaChat
from app.vectorstore import get_vector_store
from app.vectorstore.pgvector import PgVectorStore
from app.vectorstore.qdrant import QdrantStore


def test_settings_read_from_env(clean_env: pytest.MonkeyPatch) -> None:
    clean_env.setenv("LLM_MODEL", "llama3.1:8b")
    clean_env.setenv("EMBEDDING_MODEL", "nomic-embed-text")
    clean_env.setenv("EMBEDDING_DIM", "1024")
    clean_env.setenv("VECTOR_STORE", "pgvector")
    get_settings.cache_clear()

    settings = get_settings()
    assert settings.llm_model == "llama3.1:8b"
    assert settings.embedding_model == "nomic-embed-text"
    assert settings.embedding_dim == 1024
    assert settings.vector_store == "pgvector"
    assert settings.llm_configured and settings.embeddings_configured


def test_chat_provider_raises_when_model_unset() -> None:
    with pytest.raises(ProviderNotConfiguredError, match="LLM_MODEL not configured"):
        get_chat_provider(Settings(llm_model=""))


def test_embedding_provider_raises_when_model_unset() -> None:
    with pytest.raises(ProviderNotConfiguredError, match="EMBEDDING_MODEL not configured"):
        get_embedding_provider(Settings(embedding_model=""))


def test_provider_selection_is_config_driven() -> None:
    settings = Settings(llm_model="some-model", embedding_model="some-embedder")
    assert isinstance(get_chat_provider(settings), OllamaChat)
    assert isinstance(get_embedding_provider(settings), OllamaEmbeddings)


def test_vector_store_selection_is_config_driven() -> None:
    assert isinstance(get_vector_store(Settings(vector_store="qdrant")), QdrantStore)
    assert isinstance(get_vector_store(Settings(vector_store="pgvector")), PgVectorStore)
