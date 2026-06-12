import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "file:./.test_geoguard.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
os.environ.setdefault("SESSION_VALIDATION_ENABLED", "false")

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
