import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# Schema is PostgreSQL; unit tests must not require a live engine.
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@127.0.0.1:5432/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")
os.environ.setdefault("SESSION_VALIDATION_ENABLED", "false")

from app.main import app  # noqa: E402
from prisma import Prisma


@pytest.fixture
def client():
    """HTTP client for unit tests that do not need a real database.

    Lifespan always calls db.connect(); mock it so /health and OpenAPI tests
    work in CI without Postgres (integration suites bring their own client).
    Prisma 0.15 client methods are read-only on the instance, so patch the class.
    """
    with (
        patch.object(Prisma, "connect"),
        patch.object(Prisma, "disconnect"),
    ):
        with TestClient(app) as test_client:
            yield test_client
