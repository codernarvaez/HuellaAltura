import logging
import secrets
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from prisma import Prisma
from prisma.models import User

from app.config import settings
from app.core import endpoints, roles
from app.database import get_db
from app.dependencies import (
    get_current_user,
    get_optional_current_user,
)
from app.firebase_auth import FirebaseTokenError, verify_firebase_id_token
from app.limiter import limiter
from app.schemas.user import (
    FirebaseLogin,
    PasswordResetConfirm,
    PasswordResetRequest,
    ProfileUpdate,
    Token,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.security import (
    create_access_token,
    create_password_reset_token,
    generate_session_token,
    get_email_from_token_unverified,
    get_password_hash,
    verify_password,
    verify_password_reset_token,
)
from app.utils.email import send_password_reset_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix=endpoints.AUTH_PREFIX, tags=["Autenticación"])


def _split_display_name(name: str | None) -> tuple[str | None, str | None]:
    if not name or not name.strip():
        return None, None
    parts = name.strip().split(None, 1)
    if len(parts) == 1:
        return parts[0], None
    return parts[0], parts[1]


async def _issue_session(db: Prisma, user: User) -> Token:
    if user.status != "ACTIVO":
        raise HTTPException(status_code=403, detail=f"Cuenta {user.status}")

    new_session_token = generate_session_token()
    await db.user.update(where={"id": user.id}, data={"session_token": new_session_token})
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.name, "session_token": new_session_token},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post(
    endpoints.AUTH_REGISTER,
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Usuario",
    description=(
        "Crea una nueva cuenta de usuario. Registro público limitado a rol PRODUCTOR. "
        "Otros roles requieren SUPER_ADMIN."
    ),
)
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_in: UserCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    try:
        # 1. Validaciones básicas de seguridad
        if len(user_in.password) < 8:
            raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")

        # Normalizar email
        email_lower = user_in.email.lower()

        # 2. Verificar duplicados
        user_exists = await db.user.find_unique(where={"email": email_lower})
        if user_exists:
            raise HTTPException(status_code=400, detail="El email ya está registrado")

        if user_in.identifier:
            id_exists = await db.user.find_unique(where={"identifier": user_in.identifier})
            if id_exists:
                raise HTTPException(status_code=400, detail="El identificador (cédula/ID) ya está en uso")

        if user_in.phone_number:
            phone_exists = await db.user.find_unique(where={"phone_number": user_in.phone_number})
            if phone_exists:
                raise HTTPException(status_code=400, detail="El número de teléfono ya está registrado")

        # 3. Gestión de Roles (Seguridad)
        # Por defecto, registros públicos son PRODUCTOR.
        target_role_name = user_in.role_name or roles.PRODUCTOR

        # Si el rol solicitado no es PRODUCTOR, se requiere ser SUPER_ADMIN
        if target_role_name != roles.PRODUCTOR:
            if not current_user or current_user.role.name != roles.SUPER_ADMIN:
                logger.warning(
                    f"Intento de registro no autorizado para rol {target_role_name} desde {request.client.host}"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo un SUPER_ADMIN puede registrar usuarios con roles distintos a PRODUCTOR",
                )

        role = await db.role.find_unique(where={"name": target_role_name})
        if not role:
            raise HTTPException(status_code=400, detail=f"El rol '{target_role_name}' no existe en el sistema")

        return await db.user.create(
            data={
                "email": email_lower,
                "first_name": user_in.first_name,
                "last_name": user_in.last_name,
                "identifier": user_in.identifier,
                "phone_number": user_in.phone_number,
                "edad": user_in.edad,
                "genero": user_in.genero.name if user_in.genero else None,
                "nivel_educativo": user_in.nivel_educativo.name if user_in.nivel_educativo else None,
                "password_hash": get_password_hash(user_in.password),
                "role_id": role.id,
                "status": "ACTIVO",
            },
            include={"role": True},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Error interno en servidor") from None


@router.post(
    endpoints.AUTH_LOGIN,
    response_model=Token,
    summary="Iniciar Sesión",
    description="Autentica al usuario y devuelve un token JWT. Soporta formato JSON.",
)
@limiter.limit("10/minute")
async def login(request: Request, login_data: UserLogin, db: Annotated[Prisma, Depends(get_db)]):
    email_lower = login_data.email.lower()
    user = await db.user.find_unique(where={"email": email_lower}, include={"role": True})
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if user.status != "ACTIVO":
        raise HTTPException(status_code=403, detail=f"Cuenta {user.status}")

    return await _issue_session(db, user)


@router.post(
    endpoints.AUTH_FIREBASE,
    response_model=Token,
    summary="Iniciar sesión con Firebase",
    description=(
        "Verifica un ID token de Firebase Authentication del proyecto configurado "
        "y devuelve el JWT de la plataforma. Si el correo no existe, crea un PRODUCTOR."
    ),
)
@limiter.limit("10/minute")
async def login_with_firebase(
    request: Request,
    body: FirebaseLogin,
    db: Annotated[Prisma, Depends(get_db)],
):
    try:
        claims = verify_firebase_id_token(body.id_token)
    except FirebaseTokenError as exc:
        message = str(exc)
        status_code = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if message.startswith("No se pudieron obtener")
            else status.HTTP_401_UNAUTHORIZED
        )
        raise HTTPException(status_code=status_code, detail=message) from None

    if not claims.get("email_verified"):
        raise HTTPException(status_code=403, detail="Confirma el correo antes de continuar")

    email = str(claims["email"]).lower()
    user = await db.user.find_unique(where={"email": email}, include={"role": True})
    if user:
        return await _issue_session(db, user)

    role = await db.role.find_unique(where={"name": roles.PRODUCTOR})
    if not role:
        raise HTTPException(status_code=500, detail="El rol PRODUCTOR no existe")

    first_name, last_name = _split_display_name(claims.get("name") if isinstance(claims.get("name"), str) else None)
    user = await db.user.create(
        data={
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "password_hash": get_password_hash(secrets.token_urlsafe(32)),
            "role_id": role.id,
            "status": "ACTIVO",
        },
        include={"role": True},
    )
    return await _issue_session(db, user)


@router.get(
    endpoints.AUTH_ME,
    response_model=UserOut,
    summary="Obtener Perfil Actual",
    description="Devuelve la información del usuario autenticado basado en el token JWT.",
)
async def get_me(current_user: Annotated[UserOut, Depends(get_current_user)]):
    return current_user


@router.patch(
    endpoints.AUTH_ME,
    response_model=UserOut,
    summary="Actualizar perfil propio",
    description="El usuario autenticado actualiza su nombre, cédula, teléfono y datos del módulo de productor.",
)
async def update_me(
    data: ProfileUpdate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    cambios = data.model_dump(exclude_unset=True)
    if not cambios:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")

    update_data: dict = {}
    if "first_name" in cambios:
        update_data["first_name"] = (cambios["first_name"] or "").strip() or None
    if "last_name" in cambios:
        update_data["last_name"] = (cambios["last_name"] or "").strip() or None
    if "phone_number" in cambios:
        phone = (cambios["phone_number"] or "").strip() or None
        if phone:
            existente = await db.user.find_first(where={"phone_number": phone, "NOT": {"id": current_user.id}})
            if existente:
                raise HTTPException(status_code=400, detail="Ese teléfono ya está registrado")
        update_data["phone_number"] = phone
    if "identifier" in cambios:
        identifier = (cambios["identifier"] or "").strip() or None
        if identifier:
            existente = await db.user.find_first(where={"identifier": identifier, "NOT": {"id": current_user.id}})
            if existente:
                raise HTTPException(status_code=400, detail="Esa cédula ya está registrada")
        update_data["identifier"] = identifier
    if "edad" in cambios:
        update_data["edad"] = cambios["edad"]
    if "genero" in cambios:
        genero = cambios["genero"]
        update_data["genero"] = getattr(genero, "name", genero) if genero is not None else None
    if "nivel_educativo" in cambios:
        nivel = cambios["nivel_educativo"]
        update_data["nivel_educativo"] = getattr(nivel, "name", nivel) if nivel is not None else None

    return await db.user.update(where={"id": current_user.id}, data=update_data, include={"role": True})


@router.post(
    endpoints.AUTH_RECOVERY,
    summary="Recuperar Contraseña",
    description="Envía un correo electrónico con un enlace de recuperación si el usuario existe.",
)
@limiter.limit("3/minute")
async def recover_password(
    request: Request,
    data: PasswordResetRequest,
    db: Annotated[Prisma, Depends(get_db)],
    background_tasks: BackgroundTasks,
):
    email_lower = data.email.lower()
    user = await db.user.find_unique(where={"email": email_lower})
    if user:
        token = create_password_reset_token(email_lower, user.password_hash)
        background_tasks.add_task(send_password_reset_email, email_lower, token)
    return {"message": "En caso de que el email exista, se ha enviado un enlace de recuperación"}


@router.post(
    endpoints.AUTH_RESET,
    summary="Restablecer Contraseña",
    description="Cambia la contraseña utilizando un token de recuperación válido.",
)
async def reset_password(data: PasswordResetConfirm, db: Annotated[Prisma, Depends(get_db)]):
    email = get_email_from_token_unverified(data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Token inválido")

    user = await db.user.find_unique(where={"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")

    verified_email = verify_password_reset_token(data.token, user.password_hash)
    if not verified_email:
        raise HTTPException(status_code=400, detail="Token inválido o ya utilizado")

    await db.user.update(
        where={"email": email},
        data={
            "password_hash": get_password_hash(data.new_password),
            "session_token": generate_session_token(),
        },
    )
    return {"message": "Contraseña actualizada exitosamente"}
