from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma

from app.database import get_db
from app.dependencies import log_user_action, require_roles
from app.routers.acopio.roles import GERENCIA
from app.schemas.acopio import OrdenCompraCreate

router = APIRouter(prefix="/acopio/compras", tags=["Acopio - Órdenes de Compra"])


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
