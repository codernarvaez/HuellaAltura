"""Cliente S2S hacia sender-service (único dueño de Resend)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)

_PROCESS_VERIFIED = "/api/v1/notify/process-verified"


class SenderClientError(Exception):
    """Fallo al llamar a sender-service."""


def _base_url(settings: Settings) -> str:
    raw = (settings.sender_service_url or "").strip().rstrip("/")
    if not raw:
        return ""
    if "://" not in raw:
        return f"https://{raw}"
    return raw


def is_sender_configured(settings: Settings) -> bool:
    return bool(_base_url(settings) and settings.internal_api_key)


class SenderClient:
    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._timeout = httpx.Timeout(settings.sender_timeout_seconds)

    def _explorer_url(self, tx_hash: str | None) -> str | None:
        if not tx_hash:
            return None
        if self._s.polygon_chain_id in {80002, 80001}:
            return f"https://amoy.polygonscan.com/tx/{tx_hash}"
        return f"https://polygonscan.com/tx/{tx_hash}"

    async def notify_process_verified(
        self,
        *,
        to_email: str,
        process_id: str,
        content_hash: str,
        tx_hash: str | None,
    ) -> dict[str, Any]:
        base = _base_url(self._s)
        if not base:
            raise SenderClientError("SENDER_SERVICE_URL no configurada")

        payload: dict[str, Any] = {
            "to_email": to_email,
            "process_id": process_id,
            "content_hash": content_hash,
            "tx_hash": tx_hash,
        }
        explorer = self._explorer_url(tx_hash)
        if explorer:
            payload["explorer_url"] = explorer

        url = f"{base}{_PROCESS_VERIFIED}"
        headers = {
            "Content-Type": "application/json",
            "X-Internal-Api-Key": self._s.internal_api_key,
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.error("sender-service no responde (%s): %s", url, exc)
            raise SenderClientError(f"sender-service no responde: {exc}") from exc

        if response.status_code >= 400:
            detail = response.text[:300]
            logger.error("sender-service %s → %s: %s", _PROCESS_VERIFIED, response.status_code, detail)
            raise SenderClientError(f"sender-service {response.status_code}: {detail}")

        try:
            return response.json()
        except ValueError:
            return {"ok": True}
