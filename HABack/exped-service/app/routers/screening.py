"""Verificación en listas de sanciones y firma digital del productor.

- RF-14: consulta de las listas OFAC y ONU.
- RF-15: reporte del proceso de verificación.
- RF-16: bloqueo automático del expediente al superar el umbral.
- RF-11: firma digital del productor sobre su expediente.
"""

import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from prisma import Json, Prisma

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import (
    DesbloqueoRequest,
    FirmaProductorCreate,
    FirmaProductorOut,
    ListaSancionCreate,
    ScreeningOut,
    ScreeningRequest,
)
from app.services import screening_service

router = APIRouter()

_ADMIN = ("SUPER_ADMIN", "TENANT_ADMIN")
_GESTORES = ("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO")

# Campos que componen la identidad del productor y que quedan sellados al firmar
_CAMPOS_SNAPSHOT = (
    "tipo_persona",
    "nombres",
    "apellidos",
    "cedula",
    "razon_social",
    "ruc",
    "representante_nombres",
    "representante_apellidos",
    "representante_cedula",
    "email",
    "telefono",
    "direccion",
    "provincia",
    "canton",
    "parroquia",
)


def _obtener_productor(db: Prisma, productor_id: str):
    productor = db.productor.find_first(where={"id": productor_id})
    if not productor:
        raise HTTPException(status_code=404, detail="Productor no encontrado")
    return productor


# ===== Listas de sanciones (administración) =====

@router.post(
    "/listas",
    status_code=201,
    summary="Cargar registros en las listas de sanciones",
    dependencies=[Depends(log_user_action("cargar_lista_sanciones"))],
)
def cargar_listas(
    registros: list[ListaSancionCreate],
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_ADMIN)),
):
    """
    Carga (upsert) registros de las listas OFAC/ONU.

    Pensado tanto para la ingesta automática periódica como para la carga
    manual del snapshot oficial descargado.
    """
    creados = 0
    actualizados = 0

    for registro in registros:
        datos = {
            "fuente": registro.fuente.value,
            "referencia": registro.referencia,
            "nombre": registro.nombre,
            "nombre_normalizado": screening_service.normalizar(registro.nombre),
            "tipo": registro.tipo,
            "programa": registro.programa,
            "nacionalidad": registro.nacionalidad,
        }
        existente = db.listasancion.find_first(
            where={
                "fuente": datos["fuente"],
                "referencia": datos["referencia"],
                "nombre": datos["nombre"],
            }
        )
        if existente:
            db.listasancion.update(where={"id": existente.id}, data=datos)
            actualizados += 1
        else:
            db.listasancion.create(data=datos)
            creados += 1

    return {
        "creados": creados,
        "actualizados": actualizados,
        "total_en_listas": db.listasancion.count(),
    }


@router.get("/listas/estado", summary="Estado de las listas de sanciones")
def estado_listas(
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Informa cuántos registros hay por fuente, para saber si el screening es fiable."""
    total = db.listasancion.count()
    return {
        "total": total,
        "por_fuente": {
            fuente: db.listasancion.count(where={"fuente": fuente})
            for fuente in (screening_service.FUENTE_OFAC, screening_service.FUENTE_ONU)
        },
        "operativo": total > 0,
        "advertencia": (
            None
            if total
            else "Las listas están vacías: ningún screening puede considerarse concluyente."
        ),
    }


# ===== Screening del productor =====

@router.post(
    "/productores/{productor_id}/screening",
    summary="Verificar productor en listas de sanciones",
    dependencies=[Depends(log_user_action("screening_productor"))],
)
def ejecutar_screening(
    productor_id: str,
    peticion: ScreeningRequest | None = None,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_GESTORES)),
):
    """
    Consulta las listas OFAC y ONU para el productor y su representante legal
    (RF-14), genera el reporte (RF-15) y bloquea el expediente si alguna
    coincidencia supera el umbral (RF-16).
    """
    productor = _obtener_productor(db, productor_id)
    umbral = peticion.umbral if peticion else screening_service.UMBRAL_POR_DEFECTO

    resultado = screening_service.verificar_productor(
        db=db,
        productor=productor,
        umbral=umbral,
        ejecutado_por=current_user.get("sub"),
    )

    registro = db.screeningproductor.create(
        data={
            "productor_id": productor_id,
            "nombre_consultado": resultado["nombre_consultado"],
            "resultado": resultado["resultado"],
            "puntaje_maximo": resultado["puntaje_maximo"],
            "umbral": umbral,
            "coincidencias": Json(resultado["coincidencias"]),
            "fuentes": resultado["fuentes"],
            "ejecutado_por": resultado["ejecutado_por"],
        }
    )

    bloqueado = False
    if resultado["resultado"] == "COINCIDENCIA":
        db.productor.update(where={"id": productor_id}, data={"estado": "BLOQUEADO"})
        bloqueado = True

    return {
        "screening_id": registro.id,
        "productor_id": productor_id,
        "nombre_consultado": resultado["nombre_consultado"],
        "resultado": resultado["resultado"],
        "puntaje_maximo": resultado["puntaje_maximo"],
        "umbral": umbral,
        "coincidencias": resultado["coincidencias"],
        "expediente_bloqueado": bloqueado,
        "listas_cargadas": resultado["listas_cargadas"],
        "advertencia": (
            None
            if resultado["listas_cargadas"]
            else "Listas de sanciones vacías: resultado no concluyente."
        ),
    }


@router.get(
    "/productores/{productor_id}/screening",
    response_model=list[ScreeningOut],
    summary="Histórico de verificaciones del productor",
)
def historico_screening(
    productor_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Reporte del proceso de verificación en listas de sanciones (RF-15)."""
    _obtener_productor(db, productor_id)
    return db.screeningproductor.find_many(
        where={"productor_id": productor_id}, order={"creado_en": "desc"}
    )


@router.post(
    "/productores/{productor_id}/desbloquear",
    summary="Desbloquear expediente tras revisión manual",
    dependencies=[Depends(log_user_action("desbloquear_productor"))],
)
def desbloquear_productor(
    productor_id: str,
    peticion: DesbloqueoRequest,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_ADMIN)),
):
    """
    Levanta el bloqueo por sanciones. Es siempre una decisión humana: exige
    justificación y queda registrada en la auditoría.
    """
    productor = _obtener_productor(db, productor_id)
    if productor.estado != "BLOQUEADO":
        raise HTTPException(status_code=400, detail="El expediente no está bloqueado.")

    db.productor.update(where={"id": productor_id}, data={"estado": "BORRADOR"})

    return {
        "productor_id": productor_id,
        "estado": "BORRADOR",
        "motivo": peticion.motivo,
        "desbloqueado_por": current_user.get("sub"),
    }


# ===== Firma digital (RF-11) =====

@router.post(
    "/productores/{productor_id}/firma",
    response_model=FirmaProductorOut,
    status_code=201,
    summary="Registrar la firma digital del productor",
    dependencies=[Depends(log_user_action("firmar_expediente"))],
)
def firmar_expediente(
    productor_id: str,
    data: FirmaProductorCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_GESTORES)),
):
    """
    Registra la firma del productor sellando el estado de su expediente.

    No basta con guardar el trazo: se calcula el SHA-256 del snapshot de datos
    en ese instante, de modo que cualquier modificación posterior sea detectable
    y la firma no pueda repudiarse.
    """
    productor = _obtener_productor(db, productor_id)

    if productor.estado == "BLOQUEADO":
        raise HTTPException(
            status_code=409,
            detail="No se puede firmar un expediente BLOQUEADO por listas de sanciones.",
        )

    if data.documento_id:
        documento = db.documento.find_first(where={"id": data.documento_id})
        if not documento:
            raise HTTPException(status_code=404, detail="Documento de firma no encontrado")
        if db.firmaproductor.find_first(where={"documento_id": data.documento_id}):
            raise HTTPException(
                status_code=409, detail="Ese documento ya está asociado a otra firma."
            )

    snapshot = {campo: getattr(productor, campo, None) for campo in _CAMPOS_SNAPSHOT}
    snapshot["productor_id"] = productor_id
    # sort_keys garantiza que el hash sea reproducible al reverificar
    serializado = json.dumps(snapshot, sort_keys=True, ensure_ascii=False, default=str)
    hash_expediente = hashlib.sha256(serializado.encode("utf-8")).hexdigest()

    payload = {
        "productor_id": productor_id,
        "hash_expediente": hash_expediente,
        "snapshot_json": Json(snapshot),
        "latitud": data.latitud,
        "longitud": data.longitud,
        "firmado_en": data.firmado_en,
        "registrado_por": current_user.get("sub"),
    }
    if data.documento_id:
        payload["documento_id"] = data.documento_id

    return db.firmaproductor.create(data={k: v for k, v in payload.items() if v is not None})


@router.get(
    "/productores/{productor_id}/firma/verificar",
    summary="Verificar la integridad de la firma del productor",
)
def verificar_firma(
    productor_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Recalcula el hash del expediente y lo compara con el sellado al firmar.

    Si difieren, los datos cambiaron después de la firma y esta ya no ampara el
    contenido actual: es la señal que busca un auditor (RF-19, RF-40).
    """
    productor = _obtener_productor(db, productor_id)

    firma = db.firmaproductor.find_first(
        where={"productor_id": productor_id}, order={"creado_en": "desc"}
    )
    if not firma:
        raise HTTPException(status_code=404, detail="El productor no tiene firma registrada")

    snapshot = {campo: getattr(productor, campo, None) for campo in _CAMPOS_SNAPSHOT}
    snapshot["productor_id"] = productor_id
    serializado = json.dumps(snapshot, sort_keys=True, ensure_ascii=False, default=str)
    hash_actual = hashlib.sha256(serializado.encode("utf-8")).hexdigest()

    integra = hash_actual == firma.hash_expediente

    return {
        "productor_id": productor_id,
        "firma_id": firma.id,
        "firmado_en": firma.firmado_en,
        "hash_firmado": firma.hash_expediente,
        "hash_actual": hash_actual,
        "integra": integra,
        "mensaje": (
            "La firma ampara el contenido actual del expediente."
            if integra
            else "El expediente fue modificado después de firmarse: se requiere nueva firma."
        ),
    }
