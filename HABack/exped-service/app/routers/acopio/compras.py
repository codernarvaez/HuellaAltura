from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma

from app.database import get_db
from app.dependencies import log_user_action, require_roles, get_current_user
from app.routers.acopio.roles import GERENCIA
from app.schemas.acopio import OrdenCompraCreate, OrdenCompraOut

router = APIRouter(prefix="/acopio/compras", tags=["Acopio - Órdenes de Compra"])


@router.get(
    "/",
    response_model=list[OrdenCompraOut],
    summary="Listar todas las órdenes de compra",
)
def listar_ordenes_compra(
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene todas las órdenes de compra registradas en el sistema.

    **Retorna:**
    - Lista completa de órdenes con sus detalles (ID, muestra, precio, volumen, estado EUDR, etc.)
    """
    ordenes = db.ordencompra.find_many(include={"muestra": True})
    return ordenes


@router.get(
    "/muestra/{muestraId}",
    response_model=OrdenCompraOut,
    summary="Obtener orden de compra por muestraId",
)
def obtener_orden_por_muestra(
    muestraId: str,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene la orden de compra asociada a una muestra específica.

    **Parámetros:**
    - `muestraId`: ID único de la muestra

    **Retorna:**
    - Orden de compra con todos sus detalles si existe
    - Error 404 si no existe orden para esa muestra
    """
    orden = db.ordencompra.find_unique(where={"muestraId": muestraId})
    if not orden:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe orden de compra para la muestra {muestraId}",
        )
    return orden


@router.post(
    "/aprobar",
    dependencies=[Depends(log_user_action("aprobar_orden_compra"))],
)
def registrar_orden_compra(
    orden: OrdenCompraCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*GERENCIA)),
):
    """
    Registra la decisión de compra (RF-APE-06) validando obligatoriamente la
    elegibilidad EUDR de la finca de origen antes de autorizar (RF-APE-07).
    """
    muestra_db = db.muestra.find_unique(where={"id": orden.muestraId})
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    # 🛡️ VALIDACIÓN 1: Evitar Error 500 si la orden ya existe
    orden_existente = db.ordencompra.find_unique(where={"muestraId": orden.muestraId})
    if orden_existente:
        raise HTTPException(
            status_code=400, 
            detail="Ya existe una orden de compra para esta muestra."
        )

    # 🛡️ VALIDACIÓN 2: Evitar Error 500 si la muestra no tiene finca
    if not muestra_db.fincaId:
        raise HTTPException(
            status_code=400, 
            detail="La muestra no tiene una finca asociada para validar el EUDR."
        )

    # Semáforo EUDR: se exige la auditoría satelital más reciente en APROBADO
    auditoria_db = db.auditoria.find_first(
        where={"expediente": {"dato": {"finca_id": muestra_db.fincaId}}},
        order={"fecha_auditoria": "desc"},
    )

    finca_cumple_eudr = bool(
        auditoria_db
        and auditoria_db.resultado == "APROBADO"
        and not auditoria_db.deforestacion_detectada
    )

    if not finca_cumple_eudr:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Operación rechazada: La finca asociada no tiene una auditoría EUDR "
                "aprobada o se detectó deforestación post-2020."
            ),
        )

    # Si todo está bien, creamos la orden
    orden_db = db.ordencompra.create(
        data={
            "muestraId": orden.muestraId,
            "precioAcordado": orden.precioAcordado,
            "volumenKg": orden.volumenKg,
            "primas": orden.primas or 0.0,
            "aprobadoEUDR": True,
            "estado": "APROBADA",
        }
    )

    return {
        "mensaje": "Orden de compra autorizada exitosamente. Cumplimiento EUDR verificado.",
        "orden_id": orden_db.id,
    }