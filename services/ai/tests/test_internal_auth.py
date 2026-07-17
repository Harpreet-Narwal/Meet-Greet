from fastapi.testclient import TestClient


def test_endpoints_reject_missing_token(client: TestClient) -> None:
    response = client.post("/embeddings", json={"texts": ["hello"]})
    assert response.status_code == 401


def test_endpoints_reject_wrong_token(client: TestClient) -> None:
    response = client.post(
        "/embeddings",
        json={"texts": ["hello"]},
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert response.status_code == 401


def test_unconfigured_llm_returns_clear_503(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """§4: generation endpoints return 503 with a clear error — never crash."""
    response = client.post(
        "/decks/generate",
        json={"kind": "icebreaker", "level": 1, "locale": "en", "count": 5},
        headers=auth_headers,
    )
    assert response.status_code == 503
    assert response.json() == {"error": "LLM_MODEL not configured"}


def test_unconfigured_embedder_returns_clear_503(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post("/embeddings", json={"texts": ["hi"]}, headers=auth_headers)
    assert response.status_code == 503
    assert response.json() == {"error": "EMBEDDING_MODEL not configured"}


def test_ingest_skips_gracefully_without_embedder(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """`make seed` must succeed on a stack with no models pulled (§5)."""
    response = client.post("/decks/ingest", json={}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "skipped"
    assert body["reason"] == "EMBEDDING_MODEL not configured"
