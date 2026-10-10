from urllib.parse import urlencode

from app.config import Settings
from app.schemas.email import (
    EmailSendResponse,
    ProcessVerifiedRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    WelcomeRequest,
)
from app.services.resend_service import ResendService
from app.services.template_service import TemplateService


class EmailNotificationService:
    """Orquesta plantillas Jinja2 + despacho Resend."""

    def __init__(
        self,
        settings: Settings,
        templates: TemplateService | None = None,
        resend_client: ResendService | None = None,
    ) -> None:
        self._settings = settings
        self._templates = templates or TemplateService()
        self._resend = resend_client or ResendService(settings)

    async def send_welcome(self, payload: WelcomeRequest) -> EmailSendResponse:
        login_url = str(payload.login_url) if payload.login_url else f"{self._settings.frontend_url}/acceso"
        html = await self._templates.render(
            "welcome.html",
            {
                "first_name": payload.first_name,
                "last_name": payload.last_name,
                "full_name": f"{payload.first_name} {payload.last_name}".strip(),
                "login_url": login_url,
                "app_name": "Huella de Altura",
            },
        )
        provider_id = await self._resend.send_html(
            to_email=str(payload.to_email),
            subject="Bienvenido a Huella de Altura",
            html=html,
            tags=[{"name": "type", "value": "welcome"}],
        )
        return EmailSendResponse(
            message="Correo de bienvenida enviado",
            provider_id=provider_id or None,
            template="welcome.html",
        )

    async def send_verify_email(self, payload: VerifyEmailRequest) -> EmailSendResponse:
        if payload.verification_url:
            verification_url = str(payload.verification_url)
        else:
            qs = urlencode({"token": payload.verification_token})
            verification_url = f"{self._settings.frontend_url}/verificar-email?{qs}"

        html = await self._templates.render(
            "verify_email.html",
            {
                "first_name": payload.first_name,
                "verification_url": verification_url,
                "app_name": "Huella de Altura",
            },
        )
        provider_id = await self._resend.send_html(
            to_email=str(payload.to_email),
            subject="Verifica tu correo — Huella de Altura",
            html=html,
            tags=[{"name": "type", "value": "verify_email"}],
        )
        return EmailSendResponse(
            message="Correo de verificación enviado",
            provider_id=provider_id or None,
            template="verify_email.html",
        )

    async def send_reset_password(self, payload: ResetPasswordRequest) -> EmailSendResponse:
        if payload.reset_url:
            reset_url = str(payload.reset_url)
        else:
            qs = urlencode({"token": payload.reset_token})
            reset_url = f"{self._settings.frontend_url}/reset-password?{qs}"

        html = await self._templates.render(
            "reset_password.html",
            {
                "first_name": payload.first_name,
                "reset_url": reset_url,
                "expires_minutes": payload.expires_minutes,
                "app_name": "Huella de Altura",
            },
        )
        provider_id = await self._resend.send_html(
            to_email=str(payload.to_email),
            subject="Restablecer contraseña — Huella de Altura",
            html=html,
            tags=[{"name": "type", "value": "reset_password"}],
        )
        return EmailSendResponse(
            message="Correo de restablecimiento enviado",
            provider_id=provider_id or None,
            template="reset_password.html",
        )

    async def send_process_verified(self, payload: ProcessVerifiedRequest) -> EmailSendResponse:
        explorer = str(payload.explorer_url) if payload.explorer_url else ""
        html = await self._templates.render(
            "process_verified.html",
            {
                "process_id": payload.process_id,
                "content_hash": payload.content_hash,
                "tx_hash": payload.tx_hash or "pendiente",
                "explorer_url": explorer,
                "app_name": "Huella de Altura",
            },
        )
        provider_id = await self._resend.send_html(
            to_email=str(payload.to_email),
            subject=f"Proceso anclado — {payload.process_id}",
            html=html,
            tags=[{"name": "type", "value": "process_verified"}],
        )
        return EmailSendResponse(
            message="Correo de proceso anclado enviado",
            provider_id=provider_id or None,
            template="process_verified.html",
        )
