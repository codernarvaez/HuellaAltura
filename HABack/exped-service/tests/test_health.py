import jwt

from app.config import settings


def test_openapi_schema(client) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "openapi" in response.json()


def test_health_check(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ===== ErrorMessageMiddleware =====

def test_404_de_ruta_inexistente_es_descriptivo(client) -> None:
    response = client.get("/ruta/que/no/existe")
    assert response.status_code == 404
    assert "La ruta solicitada no existe" in response.json()["detail"]


def test_403_sin_token_es_descriptivo(client) -> None:
    response = client.post("/api/v1/labores/agendar", json={})
    assert response.status_code in (401, 403)
    assert response.json()["detail"]


def test_403_por_rol_conserva_su_mensaje(client) -> None:
    """Regresión: el middleware consumía el cuerpo y lo devolvía vacío.

    Solo reemplaza el `detail` genérico de FastAPI; cualquier otro mensaje debe
    llegar intacto al cliente.
    """
    token = jwt.encode({"sub": "u1", "role": "PRODUCTOR"}, settings.secret_key, algorithm="HS256")
    response = client.post(
        "/api/v1/labores/abc/aprobar", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403
    assert response.content, "El cuerpo de la respuesta no puede llegar vacío"
    assert "PRODUCTOR" in response.json()["detail"]
