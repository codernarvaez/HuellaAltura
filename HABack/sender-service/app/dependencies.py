from fastapi import Header, HTTPException, status

from app.config import settings


async def require_internal_api_key(
    x_internal_api_key: str | None = Header(default=None, alias="X-Internal-Api-Key"),
) -> None:
    """Solo otros microservicios (auth) pueden disparar envíos."""
    if not x_internal_api_key or x_internal_api_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "unauthorized",
                "message": "X-Internal-Api-Key inválida o ausente",
            },
        )
