from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Security, status, BackgroundTasks
from fastapi.security import APIKeyHeader

from app.config import settings
from app.database import db
from app.schemas.audit import AuditCreate, SessionValidate, SessionValidateOut
from app.core import endpoints

logger = logging.getLogger(__name__)
router = APIRouter(prefix=endpoints.INTERNAL_PREFIX, tags=["Servicios Internos"])

API_KEY_NAME = "X-Internal-Api-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def get_internal_api_key(api_key: str = Security(api_key_header)):
    if api_key == settings.internal_api_key:
        return api_key
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No se pudieron validar las credenciales internas",
    )


def _is_user_suspended(user) -> bool:
    if not (user.suspended_from and user.suspended_until):
        return False
    now = datetime.now(timezone.utc)
    susp_from = (
        user.suspended_from.replace(tzinfo=timezone.utc)
        if user.suspended_from.tzinfo is None
        else user.suspended_from
    )
    susp_until = (
        user.suspended_until.replace(tzinfo=timezone.utc)
        if user.suspended_until.tzinfo is None
        else user.suspended_until
    )
    return susp_from <= now <= susp_until


async def _record_audit_log(user_id: str, action: str, endpoint: str, ip_address: str):
    try:
        await db.auditlog.create(
            data={
                "user_id": user_id,
                "action": action,
                "endpoint": endpoint,
                "ip_address": ip_address,
            }
        )
    except Exception as e:
        logger.error("Error en registro de auditoría en background: %s", e)


@router.post(
    endpoints.INTERNAL_AUDIT,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Log de Auditoría",
)
async def create_audit_log(
    audit_data: AuditCreate,
    background_tasks: BackgroundTasks,
    _=Depends(get_internal_api_key),
):
    background_tasks.add_task(
        _record_audit_log,
        audit_data.user_id,
        audit_data.action,
        audit_data.endpoint,
        audit_data.ip_address,
    )
    return {"status": "success", "message": "Registro de auditoría en cola"}


@router.post(
    endpoints.INTERNAL_SESSION_VALIDATE,
    response_model=SessionValidateOut,
    summary="Validar sesión activa por session_token",
    description=(
        "Permite a microservicios downstream verificar que el JWT sigue vigente "
        "y que la sesión no fue invalidada por un nuevo login."
    ),
)
async def validate_session(
    data: SessionValidate,
    _=Depends(get_internal_api_key),
):
    user = await db.user.find_unique(
        where={"id": data.user_id},
        include={"role": True},
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )

    if _is_user_suspended(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta suspendida",
        )

    if user.status != "ACTIVO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acceso denegado: {user.status}",
        )

    if (
        data.session_token
        and user.session_token
        and user.session_token != data.session_token
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SESSION_INVALIDATED",
        )

    return SessionValidateOut(
        user_id=user.id,
        role=user.role.name,
        status=user.status,
    )
