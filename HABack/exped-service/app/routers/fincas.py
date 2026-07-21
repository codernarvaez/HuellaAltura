from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from prisma import Prisma, Json

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import FincaCreate, FincaOut, FincaUpdate

router = APIRouter()


def generar_eudr_id() -> str:
    return f"uuidv4-{uuid4().hex[:8].upper()}-{uuid4().hex[:5].upper()}"


def _build_finca_filter(provincia: str | None = None, canton: str | None = None) -> dict:
    """Construye filtro para búsqueda de fincas."""
    where: dict = {}
    if provincia:
        where["provincia"] = provincia
    if canton:
        where["canton"] = canton
    return where


# ===== ENDPOINTS PUBLICOS (Sin autenticacion) =====

@router.get(
    "/publico/listar",
    response_model=list[FincaOut],
    summary="Listar fincas (público - sin autenticación)",
    tags=["Público"]
)
def listar_fincas_publico(
    provincia: str | None = Query(None),
    canton: str | None = Query(None),
    db: Prisma = Depends(get_db),
):
    """
    Endpoint público para listar fincas sin autenticación.

    **Uso para Landing Page:**
    - Permite que usuarios sin token vean fincas disponibles
    - Útil para búsqueda y exploración inicial
    - Sin restricción de autenticación
    """
    try:
        where = _build_finca_filter(provincia, canton)
        fincas = db.finca.find_many(where=where)
        return fincas if fincas else []
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al listar fincas: {str(e)}")


@router.get(
    "/publico/por-usuario/{usuario_id}",
    response_model=list[FincaOut],
    summary="Obtener fincas por usuario (público - sin autenticación)",
    tags=["Público"]
)
def obtener_fincas_publico(
    usuario_id: str,
    db: Prisma = Depends(get_db),
):
    """
    Endpoint público para obtener fincas de un usuario sin autenticación.

    **Uso para Landing Page:**
    - Permite que usuarios ingresen un usuario_id y vean sus fincas
    - Útil para vista previa sin login
    - Sin restricción de autenticación
    """
    try:
        fincas = db.finca.find_many(where={"usuario_id": usuario_id})
        return fincas if fincas else []
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al obtener fincas: {str(e)}")


# ===== ENDPOINTS PRIVADOS (Requieren autenticacion) =====

@router.get("/", response_model=list[FincaOut], summary="Listar fincas")
def listar_fincas(
    provincia: str | None = Query(None),
    canton: str | None = Query(None),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista las fincas registradas en el sistema.

    **Lógica de Negocio:**
    - Permite filtrar por provincia y cantón.
    - Esta entidad es complementaria a los expedientes y permite una gestión independiente de predios.
    """
    try:
        where = _build_finca_filter(provincia, canton)
        fincas = db.finca.find_many(where=where)
        return fincas if fincas else []
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al listar fincas: {str(e)}")


@router.get("/por-usuario/{usuario_id}", response_model=list[FincaOut], summary="Obtener fincas por usuario (productor)")
def obtener_fincas_por_usuario(
    usuario_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene todas las fincas asociadas a un usuario (productor con rol PRODUCTOR).

    **Lógica de Negocio:**
    - Busca por usuario_id (el ID del usuario de auth-service)
    - Retorna todas las fincas del usuario especificado
    """
    try:
        fincas = db.finca.find_many(where={"usuario_id": usuario_id})
        return fincas if fincas else []
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al obtener fincas: {str(e)}")


@router.post(
    "/",
    response_model=FincaOut,
    status_code=201,
    summary="Crear nueva finca",
    dependencies=[Depends(log_user_action("create_finca"))],
)
def crear_finca(
    data: FincaCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Registra un nuevo predio o finca.

    **Lógica de Negocio:**
    - Vincula la finca a un usuario de auth-service (rol PRODUCTOR).
    - Genera automáticamente un `eudr_id` único.
    - Permite guardar el polígono de la finca (GeoJSON o lista de coordenadas) enviado desde dispositivos móviles.
    """
    # exclude_none: Prisma rechaza los campos opcionales enviados como None
    payload = data.model_dump(exclude_none=True)

    if payload.get("poligono"):
        payload["poligono"] = Json(payload["poligono"])

    # La relación con Productor se expresa con `connect`, no con la FK escalar
    productor_id = payload.pop("productor_id", None)
    if productor_id:
        if not db.productor.find_first(where={"id": productor_id}):
            raise HTTPException(status_code=404, detail="Productor no encontrado")
        payload["productor"] = {"connect": {"id": productor_id}}

    payload["eudr_id"] = generar_eudr_id()
    return db.finca.create(data=payload)


@router.get("/{finca_id}", response_model=FincaOut, summary="Obtener finca por ID")
def obtener_finca(
    finca_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene el detalle de una finca por su ID interno.
    """
    finca = db.finca.find_first(where={"id": finca_id})
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    return finca


@router.patch(
    "/{finca_id}",
    response_model=FincaOut,
    summary="Actualizar datos de la finca",
    dependencies=[Depends(log_user_action("update_finca"))],
)
def actualizar_finca(
    finca_id: str,
    data: FincaUpdate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "PRODUCTOR")),
):
    """
    Actualiza la información geográfica o administrativa de una finca.

    **Seguridad:**
    - Si el usuario es `PRODUCTOR`, solo puede editar si la finca le pertenece.
    """
    finca = db.finca.find_first(where={"id": finca_id})
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")

    if current_user.get("role") == "PRODUCTOR" and finca.usuario_id != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="No tienes permiso para editar esta finca")

    payload = data.model_dump(exclude_unset=True)
    if "poligono" in payload and payload.get("poligono"):
        payload["poligono"] = Json(payload["poligono"])

    return db.finca.update(where={"id": finca_id}, data=payload)


@router.delete(
    "/{finca_id}",
    summary="Eliminar finca",
    dependencies=[Depends(log_user_action("delete_finca"))],
)
def eliminar_finca(
    finca_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    """
    Elimina permanentemente el registro de una finca.
    """
    if not db.finca.find_first(where={"id": finca_id}):
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    db.finca.delete(where={"id": finca_id})
    return {"message": "Finca eliminada correctamente"}
