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
    Sube el documento como asset autenticado de tipo raw (para PDFs y documentos)
    y devuelve su public_id único.
    """
    _configurar()

    ext = os.path.splitext(nombre)[1] or ".bin"
    nombre_seguro = f"{uuid.uuid4()}{ext}"

    resultado: dict[str, Any] = cloudinary.uploader.upload(
        contenido,
        folder=f"expedientes/{carpeta}",
        resource_type="raw",   # <--- Forzamos tipo raw para conservar la extensión del PDF
        type="authenticated",  # <--- Privado y seguro
        use_filename=True,
        unique_filename=False,
        filename=nombre_seguro,
    )

    public_id = resultado.get("public_id")
    if not public_id:
        raise RuntimeError("El storage no devolvió un identificador para el documento.")
    return public_id


def url_firmada(public_id: str) -> str:
    """
    Genera la URL firmada para descargar un documento autenticado de tipo raw.
    """
    _configurar()
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        resource_type="raw",   # <--- Debe coincidir con el tipo con el que se subió
        type="authenticated",
        sign_url=True,
        secure=True,
    )
    return url