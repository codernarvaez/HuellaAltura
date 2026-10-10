"""Fachada de notificación: delega en sender-service (Resend)."""

from __future__ import annotations

import logging

from app.config import Settings
from app.services.sender_client import SenderClient, SenderClientError, is_sender_configured

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._sender = SenderClient(settings)

    async def notify_process_verified(
        self,
        *,
        to_email: str,
        process_id: str,
        content_hash: str,
        tx_hash: str | None,
    ) -> str:
        if not is_sender_configured(self._s):
            logger.warning("SENDER_SERVICE_URL no configurada; omitiendo correo a %s", to_email)
            return ""

        try:
            result = await self._sender.notify_process_verified(
                to_email=to_email,
                process_id=process_id,
                content_hash=content_hash,
                tx_hash=tx_hash,
            )
        except SenderClientError:
            raise

        provider_id = ""
        if isinstance(result, dict):
            provider_id = str(result.get("provider_id") or "")
        logger.info("Notificación vía sender-service a %s id=%s", to_email, provider_id or "-")
        return provider_id
