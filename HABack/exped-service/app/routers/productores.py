import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from prisma import Json, Prisma

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.services import screening_service

logger = logging.getLogger("exped-service.productores")
from app.schemas.schemas import (
    FincaOut,
    ProductorCreate,
    ProductorOut,
    ProductorUpdate,
    TipoPersonaEnum,
    _REQUERIDOS_JURIDICA,
    _REQUERIDOS_NATURAL,
)

router = APIRouter()

# Quién levanta y mantiene fichas de productores en campo
_GESTORES = ("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO")


def _screening_automatico(db: Prisma, productor_id: str, ejecutado_por: str | None) -> None:
    """
    Consulta las listas de sanciones al registrar un productor (RF-14).

    Corre en segundo plano para no penalizar la latencia de la captura en campo;
    el resultado se consulta después en `/cumplimiento/productores/{id}/screening`.
    Si las listas están vacías el screening no es concluyente y no se bloquea
    nada, para no frenar la operación por una ingesta pendiente.
    """
    try:
        productor = db.productor.find_first(where={"id": productor_id})
        if not productor:
            return

        resultado = screening_service.verificar_productor(
            db=db, productor=productor, ejecutado_por=ejecutado_por
        )

        db.screeningproductor.create(
            data={
                "productor_id": productor_id,
                "nombre_consultado": resultado["nombre_consultado"],
                "resultado": resultado["resultado"],
                "puntaje_maximo": resultado["puntaje_maximo"],
                "umbral": resultado["umbral"],
                "coincidencias": Json(resultado["coincidencias"]),
                "fuentes": resultado["fuentes"],
                "ejecutado_por": ejecutado_por,
            }
        )

        if resultado["resultado"] == "COINCIDENCIA":
            db.productor.update(where={"id": productor_id}, data={"estado": "BLOQUEADO"})
            logger.warning(
                "Productor %s bloqueado por coincidencia en listas de sanciones (%.1f)",
                productor_id,
                resultado["puntaje_maximo"],
            )
    except Exception:
        # Un fallo del screening no debe perder el registro ya guardado
        logger.exception("Screening automático fallido para el productor %s", productor_id)


@router.get("/", response_model=list[ProductorOut], summary="Listar productores")
def listar_productores(
    tipo_persona: TipoPersonaEnum | None = Query(None),
    estado: str | None = Query(None),
    organizacion: str | None = Query(None),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista los productores registrados (RF-19).

    Permite filtrar por tipo de persona, estado del expediente y organización.
    """
    where: dict = {}
    if tipo_persona:
        where["tipo_persona"] = tipo_persona.value
    if estado:
        where["estado"] = estado
    if organizacion:
        where["organizacion_inquilino"] = organizacion
    return db.productor.find_many(where=where)


@router.post(
    "/",
    response_model=ProductorOut,
    status_code=201,
    summary="Registrar productor (persona natural o jurídica)",
    dependencies=[Depends(log_user_action("create_productor"))],
)
def crear_productor(
    data: ProductorCreate,
    background_tasks: BackgroundTasks,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_GESTORES)),
):
    """
    Registra un productor clasificándolo como Persona Natural o Jurídica (RF-01).

    Los campos obligatorios se exigen según el tipo de persona seleccionado
    (RF-02), y se validan en el esquema antes de llegar aquí.

    Tras el alta se lanza en segundo plano la verificación en listas de
    sanciones (RF-14); si hay coincidencia, el expediente queda BLOQUEADO.
    """
    payload = data.model_dump()

    # La cédula y el RUC identifican unívocamente al sujeto dentro del inquilino
    for campo in ("cedula", "ruc"):
        valor = payload.get(campo)
        if valor and db.productor.find_first(
            where={campo: valor, "organizacion_inquilino": data.organizacion_inquilino}
        ):
            raise HTTPException(
                status_code=409,
                detail=f"Ya existe un productor con {campo} '{valor}' en esta organización.",
            )

    productor = db.productor.create(data=payload)

    background_tasks.add_task(
        _screening_automatico, db, productor.id, current_user.get("sub")
    )

    return productor


@router.get(
    "/{productor_id}",
    response_model=ProductorOut,
    summary="Obtener productor por ID",
)
def obtener_productor(
    productor_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    productor = db.productor.find_first(where={"id": productor_id})
    if not productor:
        raise HTTPException(status_code=404, detail="Productor no encontrado")
    return productor


@router.patch(
    "/{productor_id}",
    response_model=ProductorOut,
    summary="Actualizar productor",
    dependencies=[Depends(log_user_action("update_productor"))],
)
def actualizar_productor(
    productor_id: str,
    data: ProductorUpdate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_GESTORES)),
):
    """Actualiza la información del productor (RF-19)."""
    productor = db.productor.find_first(where={"id": productor_id})
    if not productor:
        raise HTTPException(status_code=404, detail="Productor no encontrado")

    if productor.estado == "BLOQUEADO":
        raise HTTPException(
            status_code=409,
            detail=(
                "El expediente está BLOQUEADO por una coincidencia en listas de "
                "sanciones y no admite modificaciones."
            ),
        )

    cambios = data.model_dump(exclude_unset=True)
    if not cambios:
        return productor
    return db.productor.update(where={"id": productor_id}, data=cambios)


@router.get(
    "/{productor_id}/fincas",
    response_model=list[FincaOut],
    summary="Listar fincas de un productor",
)
def fincas_del_productor(
    productor_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Devuelve las fincas asociadas al productor (RF-04)."""
    if not db.productor.find_first(where={"id": productor_id}):
        raise HTTPException(status_code=404, detail="Productor no encontrado")
    return db.finca.find_many(where={"productor_id": productor_id})


@router.get(
    "/{productor_id}/completitud",
    summary="Estado de completitud del expediente del productor",
)
def completitud_productor(
    productor_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Valida que el expediente esté completo antes de poder cerrarlo (RF-09).

    Comprueba tres frentes: los campos base exigidos por el tipo de persona
    (RF-02), los campos personalizados marcados como requeridos por el
    inquilino (RF-08) y los documentos obligatorios del catálogo (RF-07/08).
    """
    productor = db.productor.find_first(where={"id": productor_id})
    if not productor:
        raise HTTPException(status_code=404, detail="Productor no encontrado")

    # 1. Campos base según tipo de persona
    requeridos = (
        _REQUERIDOS_NATURAL
        if productor.tipo_persona == TipoPersonaEnum.NATURAL.value
        else _REQUERIDOS_JURIDICA
    )
    campos_faltantes = [c for c in requeridos if not getattr(productor, c, None)]

    # 2. Campos dinámicos requeridos por el inquilino
    campos_dinamicos = db.campoformulario.find_many(
        where={
            "organizacion_inquilino": productor.organizacion_inquilino,
            "entidad": "PRODUCTOR",
            "activo": True,
            "requerido": True,
        }
    )
    dinamicos_faltantes = []
    for campo in campos_dinamicos:
        if campo.visible_si_tipo_persona not in (None, productor.tipo_persona):
            continue
        valor = db.valorcampo.find_first(
            where={"campo_id": campo.id, "entidad_id": productor_id}
        )
        if not valor or not valor.valor:
            dinamicos_faltantes.append(campo.clave)

    # 3. Documentos obligatorios del catálogo
    requisitos = db.requisitodocumental.find_many(
        where={
            "organizacion_inquilino": productor.organizacion_inquilino,
            "tipo_persona": productor.tipo_persona,
            "activo": True,
            "obligatorio": True,
        }
    )
    cargados = {
        d.tipo_documento
        for d in db.documento.find_many(where={"productor_id": productor_id})
        if d.estado_validacion != "RECHAZADO"
    }
    documentos_faltantes = [r.tipo_documento for r in requisitos if r.tipo_documento not in cargados]

    completo = not (campos_faltantes or dinamicos_faltantes or documentos_faltantes)

    return {
        "productor_id": productor_id,
        "tipo_persona": productor.tipo_persona,
        "estado": productor.estado,
        "campos_base": {
            "requeridos": list(requeridos),
            "faltantes": campos_faltantes,
        },
        "campos_personalizados": {
            "requeridos": [c.clave for c in campos_dinamicos],
            "faltantes": dinamicos_faltantes,
        },
        "documentos": {
            "obligatorios": [r.tipo_documento for r in requisitos],
            "faltantes": documentos_faltantes,
        },
        "expediente_completo": completo,
    }
