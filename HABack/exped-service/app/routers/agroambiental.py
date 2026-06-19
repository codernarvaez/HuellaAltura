
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import DatoAgroambientalCreate, DatoAgroambientalOut

router = APIRouter()


@router.get(
    "/{finca_id}",
    response_model=list[DatoAgroambientalOut],
    summary="Obtener datos agroambientales de una finca",
)
def obtener_datos(
    finca_id: str,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene todos los registros técnicos agroambientales asociados a una finca.

    **Lógica de Negocio:**
    - Devuelve métricas como biodiversidad (Shannon/Simpson), uso de suelo y stock de carbono.
    - Incluye las variables dinámicas asociadas a cada registro.
    - Un dato agroambiental es el paso 2 del flujo (después de crear la Finca).

    **Relaciones:**
    - Requiere un `finca_id` obtenido de `GET /fincas/`.
    """
    if not db.finca.find_first(where={"id": finca_id}):
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    return db.dato.find_many(where={"finca_id": finca_id}, include={"variables": True})


@router.post(
    "/",
    response_model=DatoAgroambientalOut,
    status_code=201,
    summary="Crear datos agroambientales (paso 2)",
    dependencies=[Depends(log_user_action("create_agroambiental"))],
)
def crear_datos(
    data: DatoAgroambientalCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(
        require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "AUDITOR_INTERNO")
    ),
):
    """
    Registra nueva información técnica agroambiental para una finca.

    **Flujo de creación:**
    1. POST /fincas/ → crear Finca
    2. POST /agroambiental/ → crear Datos Agroambientales (AQUÍ)
    3. POST /expedientes/ → crear Expediente

    **Lógica de Negocio:**
    - Crea un registro de `DatoAgroambiental` vinculado a una Finca.
    - Opcionalmente crea `variables` dinámicas asociadas al registro.
    - El `dato_id` generado aquí es necesario para crear el Expediente y gestionar variables.
    """
    if not db.finca.find_first(where={"id": data.finca_id}):
        raise HTTPException(status_code=404, detail="Finca no encontrada")

    variables = data.variables or []
    dato_data = data.model_dump(exclude={"variables"})
    dato = db.dato.create(data=dato_data)

    for v in variables:
        db.variabledinamica.create(data={"dato_id": dato.id, **v.model_dump()})

    return db.dato.find_first(where={"id": dato.id}, include={"variables": True})


@router.patch(
    "/{dato_id}",
    response_model=DatoAgroambientalOut,
    summary="Actualizar datos agroambientales",
    dependencies=[Depends(log_user_action("update_agroambiental"))],
)
def actualizar_datos(
    dato_id: str,
    data: DatoAgroambientalCreate,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(
        require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "AUDITOR_INTERNO")
    ),
):
    """
    Actualiza un registro agroambiental existente.

    **Lógica de Negocio:**
    - Permite corregir métricas técnicas del registro especificado por `dato_id`.
    """
    dato = db.dato.find_first(where={"id": dato_id})
    if not dato:
        raise HTTPException(status_code=404, detail="Dato agroambiental no encontrado")
    return db.dato.update(
        where={"id": dato_id},
        data=data.model_dump(exclude_unset=True, exclude={"finca_id", "variables"}),
        include={"variables": True},
    )


@router.get(
    "/resumen/carbono",
    summary="Resumen de stock de carbono por finca",
)
def resumen_carbono(
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(
        require_roles("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "AUDITOR_INTERNO")
    ),
):
    """
    Obtiene un resumen comparativo del stock de carbono de todas las fincas con datos registrados.

    **Lógica de Negocio:**
    - Útil para dashboards y reportes de sostenibilidad de alto nivel.
    """
    datos = db.dato.find_many(include={"finca": True})
    return [
        {
            "nombre_finca": d.finca.nombre,
            "eudr_id": d.finca.eudr_id,
            "total_stock_carbono_tC_ha": d.total_stock_carbono,
        }
        for d in datos
        if d.total_stock_carbono is not None
    ]
