"""Verify Firebase ID tokens with Google's public certificates.

No service-account private key is stored. auth-service only checks the
signature, audience and issuer of the token issued for this project.
"""

import json
import urllib.request
from typing import Any

import jwt
from cryptography.x509 import load_pem_x509_certificate
from jwt.exceptions import PyJWTError

from app.config import settings

_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_certs: dict[str, str] | None = None


class FirebaseTokenError(Exception):
    """The bearer token is not a valid Firebase ID token for this project."""


def _fetch_certificates() -> dict[str, str]:
    request = urllib.request.Request(_CERTS_URL, headers={"Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=5) as response:
        payload = json.load(response)
    if not isinstance(payload, dict):
        raise FirebaseTokenError("Respuesta de certificados de Firebase inválida")
    return {str(kid): str(pem) for kid, pem in payload.items()}


def _certificates(refresh: bool = False) -> dict[str, str]:
    global _certs
    if _certs is None or refresh:
        _certs = _fetch_certificates()
    return _certs


def verify_firebase_id_token(token: str) -> dict[str, Any]:
    """Return the verified Firebase claims. Raises FirebaseTokenError."""
    project_id = settings.firebase_project_id.strip()
    if not project_id:
        raise FirebaseTokenError("FIREBASE_PROJECT_ID no está configurado")

    try:
        header = jwt.get_unverified_header(token)
    except PyJWTError as exc:
        raise FirebaseTokenError("Token de Firebase malformado") from exc

    kid = header.get("kid")
    if not isinstance(kid, str) or not kid:
        raise FirebaseTokenError("Token de Firebase sin identificador de clave")

    try:
        certs = _certificates()
        pem = certs.get(kid)
        if pem is None:
            certs = _certificates(refresh=True)
            pem = certs.get(kid)
        if pem is None:
            raise FirebaseTokenError("Clave de Firebase desconocida")

        public_key = load_pem_x509_certificate(pem.encode("utf-8")).public_key()
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
            leeway=10,
        )
    except FirebaseTokenError:
        raise
    except OSError as exc:
        raise FirebaseTokenError("No se pudieron obtener las claves públicas de Firebase") from exc
    except (PyJWTError, ValueError) as exc:
        raise FirebaseTokenError("Token de Firebase inválido") from exc

    if not claims.get("sub") or not claims.get("email"):
        raise FirebaseTokenError("Token de Firebase sin correo")
    return claims
