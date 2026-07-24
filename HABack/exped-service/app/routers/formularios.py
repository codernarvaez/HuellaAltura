"""Motor de formularios dinámicos configurables por inquilino (RF-08, RF-09).

Separa la *definición* del campo (`CampoFormulario`, administrada por el
TENANT_ADMIN) del *valor* capturado (`ValorCampo`), de modo que desactivar un
campo no destruye los datos ya recogidos en campo.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from prisma import Json, Prisma

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import (
    CampoFormularioCreate,
    CampoFormularioOut,
    CampoFormularioUpdate,
    EntidadFormularioEnum,
    TipoPersonaEnum,
    ValorCampoIn,
    ValorCampoOut,
)

router = APIRouter()

# Solo la administración del inquilino define la forma de los formularios
_ADMIN = ("SUPER_ADMIN", "TENANT_ADMIN")
# Quien captura datos en campo escribe valores, no definiciones
_CAPTURA = ("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "PRODUCTOR")


def _serializar_campo(campo) -> dict:
    """Normaliza el campo de Prisma al contrato público (opciones como lista)."""
    datos = campo.model_dump() if hasattr(campo, "model_dump") else dict(campo)
    opciones = datos.get("opciones")
    if isinstance(opciones, dict):
        datos["opciones"] = opciones.get("valores", [])
    return datos


# ===== Definición de campos (administrativo) =====

@router.get(
    "/campos",
    response_model=list[CampoFormularioOut],
    summary="Listar definiciones de campos del inquilino",
)
def listar_campos(
    organizacion: str = Query(..., description="Organización/Inquilino"),
    entidad: EntidadFormularioEnum | None = Query(None),
    incluir_inactivos: bool = Query(False),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_ADMIN)),
):
    where: dict = {"organizacion_inquilino": organizacion}
    if entidad:
        where["entidad"] = entidad.value
    if not incluir_inactivos:
        where["activo"] = True
    campos = db.campoformulario.find_many(where=where, order={"orden": "asc"})
    return [_serializar_campo(c) for c in campos]


@router.post(
    "/campos",
    response_model=CampoFormularioOut,
    status_code=201,
    summary="Crear campo personalizado",
    dependencies=[Depends(log_user_action("create_campo_formulario"))],
)
def crear_campo(
    data: CampoFormularioCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_ADMIN)),
):
    """Añade un campo al formulario de una entidad para un inquilino (RF-08)."""
    existente = db.campoformulario.find_first(
        where={
            "organizacion_inquilino": data.organizacion_inquilino,
            "entidad": data.entidad.value,
            "clave": data.clave,
        }
    )
    if existente:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe un campo con clave '{data.clave}' para {data.entidad.value}.",
        )

    # Prisma rechaza un campo Json con None explícito: hay que omitir la clave
    payload = data.model_dump(exclude_none=True)
    payload["entidad"] = data.entidad.value
    payload["tipo_dato"] = data.tipo_dato.value
    if data.visible_si_tipo_persona:
        payload["visible_si_tipo_persona"] = data.visible_si_tipo_persona.value
    if data.opciones:
        # Prisma exige un objeto JSON, no una lista suelta
        payload["opciones"] = Json({"valores": data.opciones})
    else:
        payload.pop("opciones", None)

    return _serializar_campo(db.campoformulario.create(data=payload))


@router.patch(
    "/campos/{campo_id}",
    response_model=CampoFormularioOut,
    summary="Modificar o desactivar un campo",
    dependencies=[Depends(log_user_action("update_campo_formulario"))],
)
def actualizar_campo(
    campo_id: str,
    data: CampoFormularioUpdate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_ADMIN)),
):
    """
    Activa, desactiva o modifica un campo (RF-09).

    Desactivar (`activo: false`) es la vía recomendada para retirar un campo:
    deja de pedirse en las apps pero conserva los valores ya capturados.
    """
    if not db.campoformulario.find_first(where={"id": campo_id}):
        raise HTTPException(status_code=404, detail="Campo no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    if "tipo_dato" in cambios and cambios["tipo_dato"]:
        cambios["tipo_dato"] = cambios["tipo_dato"].value
    if "visible_si_tipo_persona" in cambios and cambios["visible_si_tipo_persona"]:
        cambios["visible_si_tipo_persona"] = cambios["visible_si_tipo_persona"].value
    if "opciones" in cambios:
        if cambios["opciones"]:
            cambios["opciones"] = Json({"valores": cambios["opciones"]})
        else:
            cambios.pop("opciones")

    if not cambios:
        return _serializar_campo(db.campoformulario.find_first(where={"id": campo_id}))

    return _serializar_campo(db.campoformulario.update(where={"id": campo_id}, data=cambios))


@router.delete(
    "/campos/{campo_id}",
    summary="Eliminar campo definitivamente",
    dependencies=[Depends(log_user_action("delete_campo_formulario"))],
)
def eliminar_campo(
    campo_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_ADMIN)),
):
    """
    Borra el campo y, en cascada, todos sus valores capturados.

    Para retirar un campo sin perder el histórico, usa `PATCH` con
    `activo: false` en lugar de este endpoint.
    """
    campo = db.campoformulario.find_first(where={"id": campo_id})
    if not campo:
        raise HTTPException(status_code=404, detail="Campo no encontrado")

    valores = db.valorcampo.count(where={"campo_id": campo_id})
    db.campoformulario.delete(where={"id": campo_id})
    return {
        "message": "Campo eliminado",
        "valores_eliminados": valores,
    }


# ===== Esquema y valores (consumido por móvil y web) =====

@router.get(
    "/{entidad}",
    summary="Esquema de formulario para una entidad",
)
def obtener_esquema(
    entidad: EntidadFormularioEnum,
    organizacion: str = Query(..., description="Organización/Inquilino"),
    tipo_persona: TipoPersonaEnum | None = Query(
        None, description="Filtra los campos condicionados a un tipo de persona (RF-02)"
    ),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve los campos activos que la app debe renderizar.

    El móvil cachea esta respuesta para poder construir el formulario offline.
    """
    campos = db.campoformulario.find_many(
        where={
            "organizacion_inquilino": organizacion,
            "entidad": entidad.value,
            "activo": True,
        },
        order={"orden": "asc"},
    )

    if tipo_persona:
        campos = [
            c
            for c in campos
            if c.visible_si_tipo_persona in (None, tipo_persona.value)
        ]

    return {
        "entidad": entidad.value,
        "organizacion_inquilino": organizacion,
        "tipo_persona": tipo_persona.value if tipo_persona else None,
        "total_campos": len(campos),
        "campos": [_serializar_campo(c) for c in campos],
    }


@router.get(
    "/{entidad}/{entidad_id}/valores",
    response_model=list[ValorCampoOut],
    summary="Valores dinámicos capturados de un registro",
)
def obtener_valores(
    entidad: EntidadFormularioEnum,
    entidad_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    valores = db.valorcampo.find_many(
        where={"entidad": entidad.value, "entidad_id": entidad_id},
        include={"campo": True},
    )
    return [
        ValorCampoOut(
            clave=v.campo.clave,
            etiqueta=v.campo.etiqueta,
            tipo_dato=v.campo.tipo_dato,
            valor=v.valor,
        )
        for v in valores
        if v.campo
    ]


@router.put(
    "/{entidad}/{entidad_id}/valores",
    summary="Guardar valores dinámicos de un registro",
    dependencies=[Depends(log_user_action("save_valores_formulario"))],
)
def guardar_valores(
    entidad: EntidadFormularioEnum,
    entidad_id: str,
    valores: list[ValorCampoIn],
    organizacion: str = Query(..., description="Organización/Inquilino"),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles(*_CAPTURA)),
):
    """
    Guarda (upsert) los valores dinámicos capturados para un registro.

    Rechaza claves que no estén definidas o que estén desactivadas, para que un
    cliente desactualizado no introduzca datos huérfanos.
    """
    definidos = {
        c.clave: c
        for c in db.campoformulario.find_many(
            where={
                "organizacion_inquilino": organizacion,
                "entidad": entidad.value,
                "activo": True,
            }
        )
    }

    desconocidas = [v.clave for v in valores if v.clave not in definidos]
    if desconocidas:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Campos no definidos o inactivos para {entidad.value}: "
                f"{', '.join(desconocidas)}."
            ),
        )

    guardados = 0
    for entrada in valores:
        campo = definidos[entrada.clave]
        existente = db.valorcampo.find_first(
            where={"campo_id": campo.id, "entidad_id": entidad_id}
        )
        if existente:
            db.valorcampo.update(where={"id": existente.id}, data={"valor": entrada.valor})
        else:
            db.valorcampo.create(
                data={
                    "campo_id": campo.id,
                    "entidad": entidad.value,
                    "entidad_id": entidad_id,
                    "valor": entrada.valor,
                }
            )
        guardados += 1

    faltantes = [
        c.clave
        for c in definidos.values()
        if c.requerido
        and not db.valorcampo.find_first(where={"campo_id": c.id, "entidad_id": entidad_id})
    ]

    return {
        "entidad": entidad.value,
        "entidad_id": entidad_id,
        "valores_guardados": guardados,
        "campos_requeridos_faltantes": faltantes,
        "completo": not faltantes,
    }
