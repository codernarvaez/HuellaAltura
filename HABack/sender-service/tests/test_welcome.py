def test_welcome_requires_internal_key(client) -> None:
    response = client.post(
        "/api/v1/auth/welcome",
        json={"to_email": "user@example.com", "first_name": "Ana"},
    )
    assert response.status_code == 401
    assert response.json()["ok"] is False


def test_welcome_validation(client, auth_headers) -> None:
    response = client.post(
        "/api/v1/auth/welcome",
        headers=auth_headers,
        json={"to_email": "not-an-email", "first_name": "Ana"},
    )
    assert response.status_code == 422


def test_welcome_ok(client, auth_headers, mock_resend_ok) -> None:
    response = client.post(
        "/api/v1/auth/welcome",
        headers=auth_headers,
        json={
            "to_email": "user@example.com",
            "first_name": "Ana",
            "last_name": "Pérez",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["provider_id"] == "email_test_123"
    assert body["template"] == "welcome.html"
    mock_resend_ok.post.assert_awaited()
