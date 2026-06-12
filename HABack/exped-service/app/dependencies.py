from typing import Annotated, Callable
import logging

import httpx
from fastapi import BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.core import endpoints
from app.core.roles import SUPER_ADMIN
from app.services.audit_client import send_audit_log

logger = logging.getLogger("exped-service.dependencies")
_bearer = HTTPBearer()


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def _validate_session_with_auth_service(user_id: str, session_token: str | None) -> dict:
    if not settings.session_validation_enabled or not settings.auth_service_url:
        return {}

    url = f"{settings.auth_service_url.rstrip('/')}{endpoints.AUTH_INTERNAL_SESSION_VALIDATE}"
    headers = {"X-Internal-Api-Key": settings.internal_api_key}
    payload = {"user_id": user_id, "session_token": session_token}

    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.post(url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.error("auth-service no disponible para validar sesión: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de autenticación no disponible",
        ) from exc

    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        detail = response.json().get("detail", "Sesión inválida")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if response.status_code == status.HTTP_403_FORBIDDEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=response.json().get("detail", "Acceso denegado"),
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Error al validar sesión con auth-service",
        )

    return response.json()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    payload = _decode_jwt(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin identificador de usuario",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session_data = _validate_session_with_auth_service(
        user_id=user_id,
        session_token=payload.get("session_token"),
    )

    if session_data:
        payload["role"] = session_data.get("role", payload.get("role"))
        payload["status"] = session_data.get("status")

    return payload


class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)) -> dict:
        role = current_user.get("role")
        if role == SUPER_ADMIN:
            return current_user
        if role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol '{role}' no tiene permisos para esta acción",
            )
        return current_user


def require_roles(*allowed: str):
    return RoleChecker(list(allowed))


def log_user_action(action: str) -> Callable:
    def _dependency(
        request: Request,
        background_tasks: BackgroundTasks,
        current_user: Annotated[dict, Depends(get_current_user)],
    ):
        background_tasks.add_task(
            send_audit_log,
            current_user.get("sub", "unknown"),
            action,
            str(request.url.path),
            get_client_ip(request),
        )
        return None

    return _dependency
