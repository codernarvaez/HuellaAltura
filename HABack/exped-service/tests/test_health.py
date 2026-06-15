def test_openapi_schema(client) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "openapi" in response.json()


def test_health_check(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
