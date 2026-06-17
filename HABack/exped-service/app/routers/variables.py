
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from prisma import Prisma

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import (
    VariableDinamicaCreate,
    VariableDinamicaOut,
    VariableDinamicaUpdate,
)

router = APIRouter()

_editor = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "AUDITOR_INTERNO"))


@router.get(
    "/",
    response_model=List[VariableDinamicaOut],
    summary="Listar todas las variables dinámicas (administrativo)",
)
def listar_todas_variables(
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    return db.variabledinamica.find_many()


@router.get(
    "/search/por-nombre",
    response_model=List[VariableDinamicaOut],
    summary="Buscar variables dinámicas por nombre",
)
def buscar_por_nombre(
    nombre: str = Query(..., min_length=1),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    return db.variabledinamica.find_many(
        where={"nombre": {"contains": nombre, "mode": "insensitive"}}
    )


@router.get(
    "/search/por-tipo",
    response_model=List[VariableDinamicaOut],
    summary="Buscar variables dinámicas por tipo de dato",
)
def buscar_por_tipo(
    tipo: str = Query(..., min_length=1),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    return db.variabledinamica.find_many(where={"tipo_dato": tipo})


@router.get(
    "/search/por-seccion",
    response_model=List[VariableDinamicaOut],
    summary="Buscar variables dinámicas por sección/módulo",
)
def buscar_por_seccion(
    seccion: str = Query(..., min_length=1),
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN")),
):
    return db.variabledinamica.find_many(
        where={"seccion": {"contains": seccion, "mode": "insensitive"}}
    )


@router.get(
    "/{dato_id}",
    response_model=list[VariableDinamicaOut],
    summary="Listar variables dinámicas de un dato",
)
def listar_variables(
    dato_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista todas las variables dinámicas asociadas a un registro agroambiental.

    **Relaciones:**
    - Requiere un `dato_id` obtenido de los datos agroambientales de un expediente.
    """
    if not db.dato.find_first(where={"id": dato_id}):
        raise HTTPException(status_code=404, detail="Dato agroambiental no encontrado")
    return db.variabledinamica.find_many(where={"dato_id": dato_id})


@router.post(
    "/{dato_id}",
    response_model=VariableDinamicaOut,
    status_code=201,
    summary="Agregar variable dinámica a un dato",
    dependencies=[Depends(log_user_action("create_variable"))],
)
def crear_variable(
    dato_id: str,
    data: VariableDinamicaCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = _editor,
):
    """
    Crea una nueva variable dinámica vinculada a un registro agroambiental.

    **Lógica de Negocio:**
    - Permite extender la información técnica de un registro sin cambiar el esquema de base de datos.
    - Útil para capturar datos específicos de una región o cultivo que no están en el formulario base.
    """
    if not db.dato.find_first(where={"id": dato_id}):
        raise HTTPException(status_code=404, detail="Dato agroambiental no encontrado")
    return db.variabledinamica.create(data={"dato_id": dato_id, **data.model_dump()})


@router.patch(
    "/{dato_id}/{variable_id}",
    response_model=VariableDinamicaOut,
    summary="Actualizar variable dinámica",
    dependencies=[Depends(log_user_action("update_variable"))],
)
def actualizar_variable(
    dato_id: str,
    variable_id: int,
    data: VariableDinamicaUpdate,
    db: Prisma = Depends(get_db),
    current_user: dict = _editor,
):
    """
    Actualiza el nombre o valor de una variable dinámica existente.
    """
    if not db.variabledinamica.find_first(where={"id": variable_id, "dato_id": dato_id}):
        raise HTTPException(status_code=404, detail="Variable no encontrada")
    return db.variabledinamica.update(
        where={"id": variable_id},
        data=data.model_dump(exclude_unset=True),
    )


@router.delete(
    "/{dato_id}/{variable_id}",
    summary="Eliminar variable dinámica",
    dependencies=[Depends(log_user_action("delete_variable"))],
)
def eliminar_variable(
    dato_id: str,
    variable_id: int,
    db: Prisma = Depends(get_db),
    current_user: dict = _editor,
):
    """
    Elimina permanentemente una variable dinámica.
    """
    if not db.variabledinamica.find_first(where={"id": variable_id, "dato_id": dato_id}):
        raise HTTPException(status_code=404, detail="Variable no encontrada")
    db.variabledinamica.delete(where={"id": variable_id})
    return {"message": "Variable eliminada correctamente"}
