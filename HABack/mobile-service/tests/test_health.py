def test_health_check(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_openapi_schema(client) -> None:
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    assert "openapi" in response.json()
