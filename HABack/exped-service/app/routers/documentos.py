"""Expediente documental del productor y la finca.

Cubre RF-07/08 (documentos obligatorios por tipo de persona), RF-09 (validar
completitud antes de cerrar el expediente), RF-10 (fotografías de documentos
desde el móvil) y RF-28 (consulta de evidencias documentales).
"""

import hashlib

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from prisma import Json, Prisma

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import (
    DocumentoCreate,
    DocumentoOut,
    DocumentoUpdate,
    RequisitoDocumentalCreate,
    RequisitoDocumentalOut,
    RequisitoDocumentalUpdate,
    TipoPersonaEnum,
)
from app.services.storage_service import subir_documento_privado, url_firmada

router = APIRouter()

_ADMIN = ("SUPER_ADMIN", "TENANT_ADMIN")
_CAPTURA = ("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "PRODUCTOR")
_VALIDADORES = ("SUPER_ADMIN", "TENANT_ADMIN", "AUDITOR_INTERNO")


# ===== Catálogo de requisitos documentales (administrativo) =====

@router.get(
    "/requisitos",
    response_model=list[RequisitoDocumentalOut],
    summary="Listar requisitos documentales por tipo de persona",
)
def listar_requisitos(
    organizacion: str = Query(...),
    tipo_persona: TipoPersonaEnum | None = Query(None),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Documentos exigidos a personas naturales (RF-07) y jurídicas (RF-08)."""
    where: dict = {"organizacion_inquilino": organizacion, "activo": True}
    if tipo_persona:
        where["tipo_persona"] = tipo_persona.value
    return db.requisitodocumental.find_many(where=where, order={"orden": "asc"})


@router.post(
    "/requisitos",
    response_model=RequisitoDocumentalOut,
    status_code=201,
    summary="Definir requisito documental",
    dependencies=[Depends(log_user_action("create_requisito_documental"))],
)
def crear_requisito(
    data: RequisitoDocumentalCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_ADMIN)),
):
    existente = db.requisitodocumental.find_first(
        where={
            "organizacion_inquilino": data.organizacion_inquilino,
            "tipo_persona": data.tipo_persona.value,
            "tipo_documento": data.tipo_documento,
        }
    )
    if existente:
        raise HTTPException(
            status_code=409,
            detail=f"El requisito '{data.tipo_documento}' ya está definido para este tipo de persona.",
        )

    payload = data.model_dump()
    payload["tipo_persona"] = data.tipo_persona.value
    return db.requisitodocumental.create(data=payload)


@router.patch(
    "/requisitos/{requisito_id}",
    response_model=RequisitoDocumentalOut,
    summary="Modificar o desactivar requisito documental",
    dependencies=[Depends(log_user_action("update_requisito_documental"))],
)
def actualizar_requisito(
    requisito_id: str,
    data: RequisitoDocumentalUpdate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_ADMIN)),
):
    if not db.requisitodocumental.find_first(where={"id": requisito_id}):
        raise HTTPException(status_code=404, detail="Requisito no encontrado")
    cambios = data.model_dump(exclude_unset=True)
    if not cambios:
        return db.requisitodocumental.find_first(where={"id": requisito_id})
    return db.requisitodocumental.update(where={"id": requisito_id}, data=cambios)


# ===== Documentos =====

@router.post(
    "/",
    response_model=DocumentoOut,
    status_code=201,
    summary="Registrar documento ya subido al storage",
    dependencies=[Depends(log_user_action("create_documento"))],
)
def registrar_documento(
    data: DocumentoCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_CAPTURA)),
):
    """
    Registra los metadatos de un documento cuyo archivo ya está en el storage.

    Es la vía que usa el móvil tras sincronizar: sube el archivo y luego envía
    el hash calculado en el dispositivo para poder verificar integridad.
    """
    _validar_titular(db, data.productor_id, data.finca_id)

    payload = data.model_dump(exclude_none=True)
    payload["subido_por"] = current_user.get("sub")
    if data.ocr_json:
        payload["ocr_json"] = Json(data.ocr_json)
    else:
        payload.pop("ocr_json", None)

    return db.documento.create(data=_conectar_titular(payload))


@router.post(
    "/subir",
    response_model=DocumentoOut,
    status_code=201,
    summary="Subir archivo de documento y registrarlo",
    dependencies=[Depends(log_user_action("upload_documento"))],
)
async def subir_documento(
    organizacion_inquilino: str = Form(...),
    tipo_documento: str = Form(...),
    productor_id: str | None = Form(None),
    finca_id: str | None = Form(None),
    archivo: UploadFile = File(...),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_CAPTURA)),
):
    """
    Sube la fotografía o escaneo de un documento legal y lo registra (RF-10, RF-17).

    El SHA-256 se calcula aquí sobre el archivo recibido, de modo que el hash
    almacenado corresponde siempre al contenido realmente guardado.
    """
    if not productor_id and not finca_id:
        raise HTTPException(
            status_code=400,
            detail="El documento debe asociarse a un productor o a una finca.",
        )
    _validar_titular(db, productor_id, finca_id)

    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    hash_sha256 = hashlib.sha256(contenido).hexdigest()
    url = subir_documento_privado(
        contenido=contenido,
        nombre=archivo.filename or tipo_documento,
        carpeta=f"{organizacion_inquilino}/{productor_id or finca_id}",
    )

    return db.documento.create(
        data=_conectar_titular(
            {
                "organizacion_inquilino": organizacion_inquilino,
                "productor_id": productor_id,
                "finca_id": finca_id,
                "tipo_documento": tipo_documento,
                "nombre_archivo": archivo.filename,
                "url_storage": url,
                "hash_sha256": hash_sha256,
                "mime": archivo.content_type,
                "tamano_bytes": len(contenido),
                "subido_por": current_user.get("sub"),
            }
        )
    )


@router.get(
    "/",
    response_model=list[DocumentoOut],
    summary="Listar documentos de un productor o finca",
)
def listar_documentos(
    productor_id: str | None = Query(None),
    finca_id: str | None = Query(None),
    tipo_documento: str | None = Query(None),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Consulta de evidencias documentales (RF-28)."""
    if not productor_id and not finca_id:
        raise HTTPException(
            status_code=400,
            detail="Indica productor_id o finca_id para listar documentos.",
        )
    where: dict = {}
    if productor_id:
        where["productor_id"] = productor_id
    if finca_id:
        where["finca_id"] = finca_id
    if tipo_documento:
        where["tipo_documento"] = tipo_documento
    return db.documento.find_many(where=where, order={"creado_en": "desc"})


@router.get(
    "/{documento_id}/descarga",
    summary="Obtener enlace de descarga del documento",
)
def obtener_enlace_descarga(
    documento_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Devuelve la URL firmada del archivo almacenado (RF-28, RF-29)."""
    documento = db.documento.find_first(where={"id": documento_id})
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    return {
        "documento_id": documento_id,
        "tipo_documento": documento.tipo_documento,
        "nombre_archivo": documento.nombre_archivo,
        "hash_sha256": documento.hash_sha256,
        "url": url_firmada(documento.url_storage),
    }


@router.patch(
    "/{documento_id}",
    response_model=DocumentoOut,
    summary="Validar o rechazar un documento",
    dependencies=[Depends(log_user_action("update_documento"))],
)
def actualizar_documento(
    documento_id: str,
    data: DocumentoUpdate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_VALIDADORES)),
):
    """Revisión documental del expediente por parte del técnico o auditor."""
    if not db.documento.find_first(where={"id": documento_id}):
        raise HTTPException(status_code=404, detail="Documento no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    if "estado_validacion" in cambios and cambios["estado_validacion"]:
        cambios["estado_validacion"] = cambios["estado_validacion"].value
    if "ocr_json" in cambios:
        cambios["ocr_json"] = Json(cambios["ocr_json"]) if cambios["ocr_json"] else None
    if not cambios:
        return db.documento.find_first(where={"id": documento_id})
    return db.documento.update(where={"id": documento_id}, data=cambios)


@router.delete(
    "/{documento_id}",
    summary="Eliminar documento",
    dependencies=[Depends(log_user_action("delete_documento"))],
)
def eliminar_documento(
    documento_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_ADMIN)),
):
    if not db.documento.find_first(where={"id": documento_id}):
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    db.documento.delete(where={"id": documento_id})
    return {"message": "Documento eliminado"}


def _conectar_titular(payload: dict) -> dict:
    """
    Traduce las FK escalares a la forma `connect` que exige el input de Prisma.

    Prisma genera un input "checked" en el que las relaciones se expresan como
    `productor: {connect: {...}}`, no como el campo escalar `productor_id`.
    """
    productor_id = payload.pop("productor_id", None)
    finca_id = payload.pop("finca_id", None)
    if productor_id:
        payload["productor"] = {"connect": {"id": productor_id}}
    if finca_id:
        payload["finca"] = {"connect": {"id": finca_id}}
    return payload


def _validar_titular(db: Prisma, productor_id: str | None, finca_id: str | None) -> None:
    if productor_id and not db.productor.find_first(where={"id": productor_id}):
        raise HTTPException(status_code=404, detail="Productor no encontrado")
    if finca_id and not db.finca.find_first(where={"id": finca_id}):
        raise HTTPException(status_code=404, detail="Finca no encontrada")
