import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# Schema is PostgreSQL; unit tests must not require a live engine.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@127.0.0.1:5432/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
os.environ.setdefault("SESSION_VALIDATION_ENABLED", "false")

from app.database import db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    """HTTP client for unit tests that do not need a real database.

    Lifespan always calls db.connect(); mock it so /health and OpenAPI tests
    work in CI without Postgres (integration suites bring their own client).
    """
    with (
        patch.object(db, "connect"),
        patch.object(db, "disconnect"),
    ):
        with TestClient(app) as test_client:
            yield test_client
