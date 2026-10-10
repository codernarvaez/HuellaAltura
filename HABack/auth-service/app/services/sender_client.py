"""Cliente S2S hacia sender-service (correos Resend)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_WELCOME = "/api/v1/auth/welcome"
_VERIFY = "/api/v1/auth/verify-email"
_RESET = "/api/v1/auth/reset-password"


class SenderClientError(Exception):
    """Fallo al llamar a sender-service."""


def _base_url() -> str:
    raw = (settings.sender_service_url or "").strip().rstrip("/")
    if not raw:
        return ""
    # Render fromService.host no incluye esquema
    if "://" not in raw:
        return f"https://{raw}"
    return raw


def is_sender_configured() -> bool:
    return bool(_base_url() and settings.internal_api_key)


async def _post(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    base = _base_url()
    if not base:
        raise SenderClientError("SENDER_SERVICE_URL no configurada")

    url = f"{base}{path}"
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Api-Key": settings.internal_api_key,
    }
    timeout = httpx.Timeout(settings.sender_timeout_seconds)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        logger.error("sender-service no responde (%s): %s", url, exc)
        raise SenderClientError(f"sender-service no responde: {exc}") from exc

    if response.status_code >= 400:
        detail = response.text[:300]
        logger.error("sender-service %s → %s: %s", path, response.status_code, detail)
        raise SenderClientError(f"sender-service {response.status_code}: {detail}")

    try:
        return response.json()
    except ValueError:
        return {"ok": True}


async def send_welcome(
    *,
    to_email: str,
    first_name: str,
    last_name: str = "",
) -> dict[str, Any]:
    return await _post(
        _WELCOME,
        {
            "to_email": to_email,
            "first_name": first_name or "Usuario",
            "last_name": last_name or "",
            "login_url": f"{settings.frontend_url.rstrip('/')}/acceso",
        },
    )


async def send_verify_email(
    *,
    to_email: str,
    first_name: str,
    verification_token: str,
) -> dict[str, Any]:
    return await _post(
        _VERIFY,
        {
            "to_email": to_email,
            "first_name": first_name or "Usuario",
            "verification_token": verification_token,
        },
    )


async def send_reset_password(
    *,
    to_email: str,
    first_name: str,
    reset_token: str,
    expires_minutes: int = 10,
) -> dict[str, Any]:
    return await _post(
        _RESET,
        {
            "to_email": to_email,
            "first_name": first_name or "Usuario",
            "reset_token": reset_token,
            "expires_minutes": expires_minutes,
            "reset_url": f"{settings.frontend_url.rstrip('/')}/reset-password?token={reset_token}",
        },
    )
