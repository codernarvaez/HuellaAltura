from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from prisma import Prisma, Json

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import FincaCreate, FincaOut, FincaUpdate

router = APIRouter()


def generar_eudr_id() -> str:
    return f"uuidv4-{uuid4().hex[:8].upper()}-{uuid4().hex[:5].upper()}"


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
    where: dict = {}
    if provincia:
        where["provincia"] = provincia
    if canton:
        where["canton"] = canton
    return db.finca.find_many(where=where)


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
    return db.finca.find_many(where={"usuario_id": usuario_id})


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
    payload = data.model_dump()

    if payload.get("poligono") is not None:
        payload["poligono"] = Json(payload["poligono"])

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

    return db.finca.update(where={"id": finca_id}, data=data.model_dump(exclude_unset=True))


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
