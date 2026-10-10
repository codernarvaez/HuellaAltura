import time

from app.services.hash_service import canonical_sha256


def test_verify_requires_api_key(client) -> None:
    response = client.post(
        "/api/v1/process/verify",
        json={"process_id": "exp-1", "payload": {"doc": "a"}},
    )
    assert response.status_code == 401


def test_hash_is_stable() -> None:
    a = canonical_sha256({"process_id": "p1", "payload": {"x": 1}})
    b = canonical_sha256({"process_id": "p1", "payload": {"x": 1}})
    assert a == b
    assert len(a) == 64


def test_verify_accepted_and_status(client, auth_headers) -> None:
    response = client.post(
        "/api/v1/process/verify",
        headers=auth_headers,
        json={
            "process_id": "cert-dds-001",
            "payload": {"expediente_id": "e1", "estado": "EMITIDO"},
            "notify": False,
        },
    )
    assert response.status_code == 202
    body = response.json()
    assert body["ok"] is True
    assert body["status"] == "accepted"
    assert body["tracking_id"]
    assert len(body["content_hash"]) == 64

    tracking_id = body["tracking_id"]
    # BackgroundTasks se ejecutan al salir de la request en TestClient
    status_resp = None
    for _ in range(20):
        status_resp = client.get(
            f"/api/v1/process/status/{tracking_id}",
            headers=auth_headers,
        )
        if status_resp.status_code == 200 and status_resp.json().get("status") == "confirmed":
            break
        time.sleep(0.05)

    assert status_resp is not None
    assert status_resp.status_code == 200
    st = status_resp.json()
    assert st["status"] == "confirmed"
    assert st["tx_hash"] and st["tx_hash"].startswith("0x")


def test_status_not_found(client, auth_headers) -> None:
    response = client.get(
        "/api/v1/process/status/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
    )
    assert response.status_code == 404
