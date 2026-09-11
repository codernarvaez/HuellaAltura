from app.database import db, prisma


def test_prisma_client_is_exported() -> None:
    assert prisma is db
