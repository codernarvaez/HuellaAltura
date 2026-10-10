import os
from unittest.mock import AsyncMock, patch

import pytest

os.environ.setdefault("RESEND_API_KEY", "re_ci_test_key_not_for_prod")
os.environ.setdefault("RESEND_FROM_EMAIL", "CI <onboarding@resend.dev>")
os.environ.setdefault("INTERNAL_API_KEY", "ci-test-internal")
os.environ.setdefault("FRONTEND_URL", "http://127.0.0.1:4321")
os.environ.setdefault("ENVIRONMENT", "test")

INTERNAL_KEY = os.environ["INTERNAL_API_KEY"]


@pytest.fixture
def client():
    from app.config import get_settings

    get_settings.cache_clear()

    from app.main import app
    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"X-Internal-Api-Key": INTERNAL_KEY}


@pytest.fixture
def mock_resend_ok():
    """Simula respuesta 200 de POST https://api.resend.com/emails."""
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.content = b'{"id":"email_test_123"}'
    mock_response.json = lambda: {"id": "email_test_123"}
    mock_response.text = '{"id":"email_test_123"}'

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.services.resend_service.httpx.AsyncClient", return_value=mock_client):
        yield mock_client
