import os

import pytest

os.environ.setdefault("INTERNAL_API_KEY", "ci-test-internal")
os.environ.setdefault("SENDER_SERVICE_URL", "http://127.0.0.1:8040")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("POLYGON_RPC_URL", "https://rpc-amoy.polygon.technology")
os.environ.setdefault("POLYGON_CHAIN_ID", "80002")
os.environ.setdefault(
    "POLYGON_PRIVATE_KEY",
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
)
os.environ.setdefault("POLYGON_DRY_RUN", "true")

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
