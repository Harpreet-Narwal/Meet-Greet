from fastapi.testclient import TestClient


def test_health_boots_without_any_model_configured(client: TestClient) -> None:
    """§4: the ai service must boot and serve /health even when LLM_MODEL is unset."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai"
    assert body["llm_configured"] is False
    assert body["embeddings_configured"] is False
    assert body["models"] == {"llm": None, "embedding": None}
    assert body["vector_store"] == "qdrant"


def test_health_requires_no_auth(client: TestClient) -> None:
    assert client.get("/health").status_code == 200
