from typing import List

from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from app.database import get_db
from app.dependencies import get_current_user, require_roles, log_user_action
from app.schemas.schemas import ProductorCreate, ProductorUpdate, ProductorOut

router = APIRouter()

_editor = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO"))


@router.get("/", response_model=List[ProductorOut], summary="Listar productores")
def listar_productores(
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return db.productor.find_many()


@router.post(
    "/",
    response_model=ProductorOut,
    status_code=201,
    summary="Crear productor",
    dependencies=[Depends(log_user_action("create_productor"))],
)
def crear_productor(
    data: ProductorCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = _editor,
):
    if db.productor.find_first(where={"cedula_id": data.cedula_id}):
        raise HTTPException(status_code=409, detail="Ya existe un productor con esa cédula")
    return db.productor.create(data=data.model_dump())


@router.get("/{productor_id}", response_model=ProductorOut, summary="Obtener productor por ID")
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
    current_user: dict = _editor,
):
    if not db.productor.find_first(where={"id": productor_id}):
        raise HTTPException(status_code=404, detail="Productor no encontrado")
    return db.productor.update(
        where={"id": productor_id},
        data=data.model_dump(exclude_unset=True),
    )


@router.delete(
    "/{productor_id}",
    summary="Eliminar productor",
    dependencies=[Depends(log_user_action("delete_productor"))],
)
def eliminar_productor(
    productor_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    if not db.productor.find_first(where={"id": productor_id}):
        raise HTTPException(status_code=404, detail="Productor no encontrado")
    db.productor.delete(where={"id": productor_id})
    return {"message": "Productor eliminado correctamente"}
