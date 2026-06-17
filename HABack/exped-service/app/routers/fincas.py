from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from prisma import Prisma

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
    where: dict = {}
    if provincia:
        where["provincia"] = provincia
    if canton:
        where["canton"] = canton
    return db.finca.find_many(where=where)


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
    if not db.productor.find_first(where={"id": data.productor_id}):
        raise HTTPException(status_code=404, detail="Productor no encontrado")
    payload = data.model_dump()
    payload["eudr_id"] = generar_eudr_id()
    return db.finca.create(data=payload)


@router.get("/{finca_id}", response_model=FincaOut, summary="Obtener finca por ID")
def obtener_finca(
    finca_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
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
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO")),
):
    if not db.finca.find_first(where={"id": finca_id}):
        raise HTTPException(status_code=404, detail="Finca no encontrada")
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
    if not db.finca.find_first(where={"id": finca_id}):
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    db.finca.delete(where={"id": finca_id})
    return {"message": "Finca eliminada correctamente"}
