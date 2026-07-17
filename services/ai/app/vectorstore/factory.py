from app.config import Settings
from app.vectorstore.base import VectorStore
from app.vectorstore.pgvector import PgVectorStore
from app.vectorstore.qdrant import QdrantStore


def get_vector_store(settings: Settings) -> VectorStore:
    if settings.vector_store == "pgvector":
        return PgVectorStore(settings.database_url, settings.embedding_dim)
    return QdrantStore(settings.qdrant_url, settings.embedding_dim)
