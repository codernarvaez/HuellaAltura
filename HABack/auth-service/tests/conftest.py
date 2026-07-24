import os
from unittest.mock import AsyncMock, patch

import pytest

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-ci")
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-key")


@pytest.fixture
def client():
    from prisma import Prisma

    # Se parchea sobre la clase y no sobre la instancia: en Prisma 0.15 los
    # métodos del cliente son de solo lectura y `patch` falla al restaurarlos
    # con "'Prisma' object attribute 'connect' is read-only".
    with (
        patch.object(Prisma, "connect", new=AsyncMock(return_value=None)),
        patch.object(Prisma, "disconnect", new=AsyncMock(return_value=None)),
    ):
        from fastapi.testclient import TestClient
        from app.main import app

        with TestClient(app) as test_client:
            yield test_client
