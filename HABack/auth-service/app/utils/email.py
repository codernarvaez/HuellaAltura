"""
Notificaciones de correo.

Preferencia: sender-service (Resend) vía S2S.
Fallback: SMTP local si sender no está configurado o falla.
"""

from __future__ import annotations

import logging
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings
from app.services import sender_client

logger = logging.getLogger(__name__)


def clean_html(raw_html: str) -> str:
    cleanr = re.compile("<.*?>", re.DOTALL)
    return re.sub(cleanr, "", raw_html)


def _smtp_configured() -> bool:
    return bool(settings.smtp_user and settings.smtp_password)


def send_email_smtp(recipient_email: str, subject: str, body_html: str) -> None:
    if not _smtp_configured():
        logger.warning("SMTP no configurado. El correo no será enviado.")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    from_email = settings.smtp_from_email or settings.smtp_user
    message["From"] = from_email
    message["To"] = recipient_email
    message.attach(MIMEText(clean_html(body_html), "plain", "utf-8"))
    message.attach(MIMEText(body_html, "html", "utf-8"))

    try:
        if settings.smtp_port == 465:
            server_class = smtplib.SMTP_SSL
        else:
            server_class = smtplib.SMTP

        with server_class(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.ehlo()
            if settings.smtp_port != 465 and settings.smtp_tls:
                server.starttls()
                server.ehlo()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
            logger.info("Correo SMTP enviado a %s", recipient_email)
    except smtplib.SMTPAuthenticationError:
        logger.error("Error de autenticación SMTP para %s", settings.smtp_user)
    except Exception as exc:
        logger.error("Error SMTP a %s: %s", recipient_email, exc)


def _legacy_reset_html(email: str, token: str) -> tuple[str, str]:
    reset_link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
    subject = "Recuperación de Contraseña - Huella de Altura"
    body_html = f"""
    <html>
      <body style="font-family:Segoe UI,sans-serif;background:#fefae3;padding:20px;color:#2b361c;">
        <div style="max-width:600px;margin:auto;background:#fff;border:2px solid #636b3f;padding:40px;border-radius:15px;">
          <h2 style="color:#636b3f;">Restablecer Contraseña</h2>
          <p>Hola,</p>
          <p>Solicitud de restablecimiento para <strong>{email}</strong>.</p>
          <p>El enlace caduca en <strong>10 minutos</strong>.</p>
          <p style="text-align:center;margin:40px 0;">
            <a href="{reset_link}"
               style="background:#636b3f;color:#fefae3;padding:15px 30px;text-decoration:none;border-radius:8px;font-weight:bold;">
              CREAR NUEVA CONTRASEÑA
            </a>
          </p>
        </div>
      </body>
    </html>
    """
    return subject, body_html


async def send_welcome_email(email: str, first_name: str, last_name: str = "") -> None:
    if sender_client.is_sender_configured():
        try:
            await sender_client.send_welcome(
                to_email=email,
                first_name=first_name or "Usuario",
                last_name=last_name or "",
            )
            logger.info("Bienvenida enviada vía sender-service a %s", email)
            return
        except sender_client.SenderClientError as exc:
            logger.warning("sender-service welcome falló (%s); sin fallback SMTP de plantilla", exc)
            return
    logger.warning("SENDER_SERVICE_URL no configurada; omitiendo bienvenida a %s", email)


async def send_password_reset_email(email: str, token: str, first_name: str = "Usuario") -> None:
    if sender_client.is_sender_configured():
        try:
            await sender_client.send_reset_password(
                to_email=email,
                first_name=first_name or "Usuario",
                reset_token=token,
                expires_minutes=10,
            )
            logger.info("Reset enviado vía sender-service a %s", email)
            return
        except sender_client.SenderClientError as exc:
            logger.warning("sender-service reset falló (%s); intentando SMTP", exc)

    if _smtp_configured():
        subject, body = _legacy_reset_html(email, token)
        send_email_smtp(email, subject, body)
        return

    logger.warning("Sin sender ni SMTP; no se envió reset a %s", email)


# Compatibilidad con imports antiguos
def send_email(recipient_email: str, subject: str, body_html: str) -> None:
    send_email_smtp(recipient_email, subject, body_html)
