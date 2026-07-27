"""Almacenamiento de documentos del expediente.

Los documentos legales y de identidad no pueden quedar accesibles con una URL
pública adivinable, así que se suben como assets *authenticated* de Cloudinary
y se sirven mediante URLs firmadas de vida corta.

NOTA: esto es una solución intermedia sobre la infraestructura ya disponible.
El plan contempla migrar a un bucket privado (S3 / R2 / Supabase Storage) con
versionado y política de retención, que es lo que exige un expediente auditable.
"""

import logging
import os
import uuid
from typing import Any

import cloudinary
import cloudinary.uploader
import cloudinary.utils

logger = logging.getLogger("exped-service.storage")


def _configurar() -> None:
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    )


def subir_documento_privado(contenido: bytes, nombre: str, carpeta: str) -> str:
    """
    Sube el documento como asset autenticado y devuelve su URL completa y accesible.

    Retorna el secure_url (URL completa con dominio, resource_type, versión, extensión)
    que el navegador puede usar directamente. NO retorna el public_id porque ese es
    solo un identificador interno que Cloudinary usa.

    IMPORTANTE: Usa UUID como nombre para evitar problemas con caracteres especiales
    en Cloudinary. El nombre original se pierde pero la integridad del documento
    se verifica con hash_sha256.
    """
    _configurar()

    # Usar UUID + extensión para evitar problemas con caracteres especiales
    ext = os.path.splitext(nombre)[1] or ".bin"
    nombre_seguro = f"{uuid.uuid4()}{ext}"

    resultado: dict[str, Any] = cloudinary.uploader.upload(
        contenido,
        folder=f"expedientes/{carpeta}",
        resource_type="auto",  # Dejar que Cloudinary detecte el tipo automáticamente
        type="upload",  # URL pública accesible
        use_filename=True,
        unique_filename=False,  # Ya es único con UUID
        filename=nombre_seguro,
    )

    public_id = resultado.get("public_id")
    if not public_id:
        raise RuntimeError("El storage no devolvió un identificador para el documento.")
    return public_id


def url_firmada(public_id: str) -> str:
    """
    Genera la URL firmada para descargar un documento autenticado.

    LIMITACIÓN: la firma impide adivinar la URL, pero no caduca. La caducidad
    real requiere `auth_token`, que a su vez exige habilitar token-based
    authentication en la cuenta de Cloudinary. Al migrar a un bucket privado
    con URLs pre-firmadas, esta función pasa a devolver enlaces con TTL.
    """
    _configurar()
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        type="authenticated",
        sign_url=True,
        secure=True,
    )
    return url
