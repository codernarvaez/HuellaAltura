"""Security utilities: JWT, password hashing, and session tokens"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt
from jwt.exceptions import PyJWTError

from app.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash using bcrypt"""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    """Generate BCrypt hash of password"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def generate_session_token() -> str:
    """Generate unique session token for single-session enforcement"""
    return str(uuid.uuid4())


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create JWT access token with session_token, user_id and role embedded.

    NOTE: The settings.secret_key (JWT_SECRET) must be shared with other
    microservices to allow them to validate tokens locally without
    calling auth-service.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify JWT token.
    """
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except PyJWTError:
        return None


def create_password_reset_token(email: str, password_hash: str) -> str:
    """
    Genera un token JWT para recuperación de contraseña (10 min).
    Incluye un fragmento del hash actual para invalidar el token si la contraseña cambia.
    """
    expire = datetime.now(UTC) + timedelta(minutes=10)
    to_encode = {
        "exp": expire,
        "sub": email,
        "purpose": "reset_password",
        "pwh": password_hash[-10:],  # Últimos 10 caracteres del hash
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def verify_password_reset_token(token: str, current_password_hash: str) -> str | None:
    """
    Verifica el token de recuperación, valida que el propósito sea correcto
    y que el hash de la contraseña no haya cambiado.
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("purpose") != "reset_password":
            return None

        # Verificar que el hash del token coincida con el hash actual
        if payload.get("pwh") != current_password_hash[-10:]:
            return None

        return payload.get("sub")
    except PyJWTError:
        return None


def get_email_from_token_unverified(token: str) -> str | None:
    """
    Extrae el email del token sin verificarlo.
    Útil para obtener el usuario y luego verificar el token con su hash actual.
    """
    try:
        payload = jwt.decode(
            token,
            options={"verify_signature": False},
            algorithms=[settings.jwt_algorithm],
        )
        return payload.get("sub")
    except Exception:
        return None
