def test_health(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["service"] == "sender-service"


def test_openapi_schema(client) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "openapi" in response.json()


def test_docs_available(client) -> None:
    response = client.get("/docs")
    assert response.status_code == 200
