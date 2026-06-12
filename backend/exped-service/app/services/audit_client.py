import logging

import httpx

from app.config import settings
from app.core import endpoints

logger = logging.getLogger("exped-service.audit")


def send_audit_log(user_id: str, action: str, endpoint: str, ip_address: str) -> None:
    if not settings.auth_service_url:
        logger.debug("AUTH_SERVICE_URL no configurada; auditoría central omitida")
        return

    url = f"{settings.auth_service_url.rstrip('/')}{endpoints.AUTH_INTERNAL_AUDIT}"
    payload = {
        "user_id": user_id,
        "action": action,
        "endpoint": endpoint,
        "ip_address": ip_address,
    }
    headers = {"X-Internal-Api-Key": settings.internal_api_key}

    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.post(url, json=payload, headers=headers)
            if response.status_code >= 400:
                logger.warning(
                    "Auditoría central rechazada (%s): %s",
                    response.status_code,
                    response.text,
                )
    except httpx.HTTPError as exc:
        logger.error("No se pudo enviar auditoría central: %s", exc)
