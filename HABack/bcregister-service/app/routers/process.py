import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.config import Settings, get_settings
from app.core import endpoints
from app.dependencies import require_internal_api_key
from app.schemas.process import (
    ProcessStatusResponse,
    ProcessVerifyAccepted,
    ProcessVerifyRequest,
)
from app.services.blockchain_service import BlockchainService
from app.services.email_service import EmailService
from app.services.hash_service import canonical_sha256
from app.services.registry_store import registry_store

logger = logging.getLogger(__name__)

router = APIRouter(tags=["process"], dependencies=[Depends(require_internal_api_key)])


async def _seal_and_notify(
    tracking_id: str,
    process_id: str,
    content_hash: str,
    notify: bool,
    notify_email: str | None,
    settings: Settings,
) -> None:
    chain = BlockchainService(settings)
    mail = EmailService(settings)
    try:
        registry_store.set_status(tracking_id, "pending")
        tx_hash = await chain.anchor_hash(process_id=process_id, content_hash=content_hash)
        registry_store.set_confirmed(tracking_id, tx_hash)
        if notify and notify_email:
            try:
                await mail.notify_process_verified(
                    to_email=notify_email,
                    process_id=process_id,
                    content_hash=content_hash,
                    tx_hash=tx_hash,
                )
            except Exception as mail_exc:
                # El anclaje ya ocurrió; el correo no debe marcar failed
                logger.warning(
                    "Anclado OK pero email falló tracking=%s: %s",
                    tracking_id,
                    mail_exc,
                )
    except Exception as exc:
        logger.exception("Fallo sellado tracking=%s", tracking_id)
        registry_store.set_failed(tracking_id, str(exc))


@router.post(
    endpoints.PROCESS_VERIFY,
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ProcessVerifyAccepted,
    summary="Anclar hash del proceso en Polygon (async)",
)
async def verify_process(
    body: ProcessVerifyRequest,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
) -> ProcessVerifyAccepted:
    content_hash = canonical_sha256({"process_id": body.process_id, "payload": body.payload})
    tracking_id = str(uuid.uuid4())
    registry_store.create(tracking_id, body.process_id, content_hash)

    background_tasks.add_task(
        _seal_and_notify,
        tracking_id,
        body.process_id,
        content_hash,
        body.notify,
        str(body.notify_email) if body.notify_email else None,
        settings,
    )
    return ProcessVerifyAccepted(
        tracking_id=tracking_id,
        process_id=body.process_id,
        content_hash=content_hash,
    )


@router.get(
    endpoints.PROCESS_STATUS,
    response_model=ProcessStatusResponse,
    summary="Estado del sellado / tx_hash",
)
async def process_status(tracking_id: str) -> ProcessStatusResponse:
    entry = registry_store.get(tracking_id)
    return ProcessStatusResponse(
        tracking_id=entry.tracking_id,
        process_id=entry.process_id,
        content_hash=entry.content_hash,
        status=entry.status,
        tx_hash=entry.tx_hash,
        error=entry.error,
    )
