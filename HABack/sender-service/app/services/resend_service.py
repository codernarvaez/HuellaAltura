"""Cliente HTTP asíncrono contra la API REST de Resend (sin SDK)."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.config import Settings

logger = logging.getLogger(__name__)

RESEND_EMAILS_URL = "https://api.resend.com/emails"


class ResendService:
    """POST asíncrono a Resend vía httpx.AsyncClient."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._timeout = httpx.Timeout(20.0, connect=5.0)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._settings.resend_api_key}",
            "Content-Type": "application/json",
        }

    async def send_html(
        self,
        *,
        to_email: str,
        subject: str,
        html: str,
        tags: list[dict[str, str]] | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "from": self._settings.resend_from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        if self._settings.resend_reply_to:
            payload["reply_to"] = str(self._settings.resend_reply_to)
        if tags:
            payload["tags"] = tags

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    RESEND_EMAILS_URL,
                    headers=self._headers(),
                    json=payload,
                )
        except httpx.HTTPError as exc:
            logger.exception("No se pudo contactar Resend para %s", to_email)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error": "provider_unavailable",
                    "message": "No se pudo contactar a la API de Resend",
                },
            ) from exc

        if response.status_code >= 400:
            detail = _safe_error_body(response)
            logger.error(
                "Resend rechazó envío a %s (%s): %s",
                to_email,
                response.status_code,
                detail,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "error": "resend_error",
                    "message": detail or "Fallo al enviar con Resend",
                    "status_code": response.status_code,
                },
            )

        data = response.json() if response.content else {}
        email_id = data.get("id") if isinstance(data, dict) else None
        return str(email_id) if email_id else ""


def _safe_error_body(response: httpx.Response) -> str:
    try:
        body = response.json()
        if isinstance(body, dict):
            msg = body.get("message") or body.get("error") or body
            return str(msg)[:400]
    except ValueError:
        pass
    return (response.text or "")[:400]
