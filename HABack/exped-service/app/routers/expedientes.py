
from fastapi import APIRouter, Depends, HTTPException, Query
from prisma import Prisma

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import (
    ExpedienteCreate,
    ExpedienteOut,
    ExpedienteUpdate,
    HistorialCreate,
    HistorialOut,
)

router = APIRouter()

_INCLUDE = {
    "historial": True,
}


@router.get("/", response_model=list[ExpedienteOut], summary="Listar todos los expedientes")
def listar_expedientes(
    estado: str | None = Query(None),
    organizacion: str | None = Query(None),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene una lista de todos los expedientes registrados en el sistema.

    **Lógica de Negocio:**
    - Permite filtrar por estado (PENDIENTE, APROBADO, etc.) y por organización inquilina.
    - Devuelve la información básica del expediente junto con sus datos agroambientales y el historial de cambios.

    **Relaciones:**
    - Los `id` de estos expedientes son necesarios para consultar detalles, agregar datos agroambientales o ejecutar auditorías.
    """
    where: dict = {}
    if estado:
        where["estado"] = estado
    if organizacion:
        where["organizacion_inquilino"] = organizacion
    return db.expediente.find_many(where=where, include=_INCLUDE)


@router.post(
    "/",
    response_model=ExpedienteOut,
    status_code=201,
    summary="Crear nuevo expediente (paso 3)",
    dependencies=[Depends(log_user_action("create_expediente"))],
)
def crear_expediente(
    data: ExpedienteCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "PRODUCTOR")),
):
    """
    Registra un nuevo expediente en el sistema.

    **Flujo de creación:**
    1. POST /fincas/ → crear Finca
    2. POST /agroambiental/ → crear Datos Agroambientales
    3. POST /expedientes/ → crear Expediente (AQUÍ)

    **Lógica de Negocio:**
    - Verifica la existencia del dato agroambiental.
    - El dato vincula la Finca con el Expediente.
    - Registra un evento inicial en el historial de trazabilidad.
    """
    dato = db.dato.find_first(where={"id": data.dato_id})
    if not dato:
        raise HTTPException(status_code=404, detail="Dato agroambiental no encontrado")

    finca = db.finca.find_first(where={"id": dato.finca_id})
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")

    create_data = data.model_dump()
    desc = f"Expediente creado para la finca {finca.nombre} con datos agroambientales"
    create_data["historial"] = {
        "create": [{
            "accion": "Expediente creado",
            "descripcion": desc,
            "usuario": current_user.get("sub", "sistema"),
        }]
    }

    expediente = db.expediente.create(data=create_data, include=_INCLUDE)
    return expediente


@router.get(
    "/eudr/{eudr_id}",
    response_model=ExpedienteOut,
    summary="Buscar por EUDR ID de la finca",
)
def buscar_por_eudr(
    eudr_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Busca un expediente utilizando el identificador internacional EUDR ID de la finca asociada.

    **Relaciones:**
    - Útil para sistemas externos que solo conocen el `eudr_id` de la finca y no el UUID interno del expediente.
    - El expediente se vincula a través del Dato Agroambiental.
    """
    finca = db.finca.find_first(where={"eudr_id": eudr_id})
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")

    dato = db.dato.find_first(where={"finca_id": finca.id})
    if not dato:
        raise HTTPException(status_code=404, detail="Datos agroambientales no encontrados")

    exp = db.expediente.find_first(where={"dato_id": dato.id}, include=_INCLUDE)
    if not exp:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    return exp


@router.get("/{expediente_id}", response_model=ExpedienteOut, summary="Obtener expediente por ID")
def obtener_expediente(
    expediente_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene el detalle completo de un expediente específico.

    **Relaciones:**
    - Devuelve el `expediente_id` interno y la lista de `datos_agroambientales` con sus propios IDs (`dato_id`).
    """
    exp = db.expediente.find_first(where={"id": expediente_id}, include=_INCLUDE)
    if not exp:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    return exp


@router.patch(
    "/{expediente_id}",
    response_model=ExpedienteOut,
    summary="Actualizar expediente",
    dependencies=[Depends(log_user_action("update_expediente"))],
)
def actualizar_expediente(
    expediente_id: str,
    data: ExpedienteUpdate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO")),
):
    """
    Actualiza campos específicos de un expediente.

    **Lógica de Negocio:**
    - Registra automáticamente una entrada en el historial detallando los campos modificados.
    - Solo actualiza los campos enviados en el cuerpo de la petición.
    """
    if not db.expediente.find_first(where={"id": expediente_id}):
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    cambios = data.model_dump(exclude_unset=True)
    db.expediente.update(where={"id": expediente_id}, data=cambios)
    db.historial.create(data={
        "expediente_id": expediente_id,
        "accion": "Expediente actualizado",
        "descripcion": f"Campos modificados: {', '.join(cambios.keys())}",
        "usuario": current_user.get("sub", "sistema"),
    })
    return db.expediente.find_first(where={"id": expediente_id}, include=_INCLUDE)


@router.delete(
    "/{expediente_id}",
    summary="Eliminar expediente",
    dependencies=[Depends(log_user_action("delete_expediente"))],
)
def eliminar_expediente(
    expediente_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Elimina un expediente y toda su información relacionada (Cascading Delete).

    **Advertencia:** Esta acción no se puede deshacer.
    """
    if not db.expediente.find_first(where={"id": expediente_id}):
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    db.expediente.delete(where={"id": expediente_id})
    return {"message": "Expediente eliminado"}


@router.get(
    "/{expediente_id}/historial",
    response_model=list[HistorialOut],
    summary="Ver historial de trazabilidad",
)
def ver_historial(
    expediente_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna la lista de eventos ocurridos sobre un expediente.

    **Relaciones:**
    - Requiere un `expediente_id` válido.
    """
    if not db.expediente.find_first(where={"id": expediente_id}):
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    return db.historial.find_many(where={"expediente_id": expediente_id})


@router.post(
    "/{expediente_id}/historial",
    response_model=HistorialOut,
    status_code=201,
    summary="Agregar evento al historial",
    dependencies=[Depends(log_user_action("add_historial_event"))],
)
def agregar_historial(
    expediente_id: str,
    data: HistorialCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO")),
):
    """
    Registra un evento manual en el historial de un expediente.

    **Lógica de Negocio:**
    - Permite registrar acciones externas o hitos importantes que no son capturados automáticamente por el sistema.
    """
    if not db.expediente.find_first(where={"id": expediente_id}):
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    payload = data.model_dump()
    payload.setdefault("usuario", current_user.get("sub", "sistema"))
    return db.historial.create(data={"expediente_id": expediente_id, **payload})
