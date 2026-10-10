from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.core import endpoints
from app.dependencies import require_internal_api_key
from app.schemas.email import (
    EmailSendResponse,
    ProcessVerifiedRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    WelcomeRequest,
)
from app.services.email_service import EmailNotificationService

router = APIRouter(tags=["auth-mail"], dependencies=[Depends(require_internal_api_key)])


def get_email_service(settings: Settings = Depends(get_settings)) -> EmailNotificationService:
    return EmailNotificationService(settings)


@router.post(
    endpoints.AUTH_WELCOME,
    response_model=EmailSendResponse,
    summary="Correo de bienvenida tras registro",
)
async def send_welcome(
    payload: WelcomeRequest,
    service: EmailNotificationService = Depends(get_email_service),
) -> EmailSendResponse:
    return await service.send_welcome(payload)


@router.post(
    endpoints.AUTH_VERIFY_EMAIL,
    response_model=EmailSendResponse,
    summary="Correo con enlace de verificación",
)
async def send_verify_email(
    payload: VerifyEmailRequest,
    service: EmailNotificationService = Depends(get_email_service),
) -> EmailSendResponse:
    return await service.send_verify_email(payload)


@router.post(
    endpoints.AUTH_RESET_PASSWORD,
    response_model=EmailSendResponse,
    summary="Correo de restablecimiento de contraseña",
)
async def send_reset_password(
    payload: ResetPasswordRequest,
    service: EmailNotificationService = Depends(get_email_service),
) -> EmailSendResponse:
    return await service.send_reset_password(payload)


@router.post(
    endpoints.NOTIFY_PROCESS_VERIFIED,
    response_model=EmailSendResponse,
    summary="Correo tras anclar proceso en Polygon (bcregister)",
)
async def send_process_verified(
    payload: ProcessVerifiedRequest,
    service: EmailNotificationService = Depends(get_email_service),
) -> EmailSendResponse:
    return await service.send_process_verified(payload)
