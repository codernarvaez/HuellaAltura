from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma

from app.database import get_db
from app.dependencies import log_user_action, require_roles
from app.routers.acopio.roles import BODEGA
from app.schemas.acopio import BodegaIngresoCreate

router = APIRouter(prefix="/acopio/bodega", tags=["Acopio - Bodega"])


@router.post(
    "/ingreso",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(log_user_action("registrar_ingreso_bodega"))],
)
def registrar_ingreso(
    ingreso: BodegaIngresoCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*BODEGA)),
):
    """
    Registra el ingreso físico del café en almacén mediante la lectura del código
    QR del productor, capturando peso y tipo de proceso (RF-APE-08).

    Es el paso que materializa el inventario del lote: sin él no existe
    `InventarioAcopio` y, por tanto, no puede haber trilla ni despacho.
    """
    orden = db.ordencompra.find_unique(
        where={"id": ingreso.ordenCompraId},
        include={"muestra": True},
    )
    if not orden:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")

    if orden.estado != "APROBADA" or not orden.aprobadoEUDR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La orden de compra no está aprobada ni validada por EUDR.",
        )

    # El QR leído en báscula debe corresponder a la muestra de origen del lote
    if orden.muestra and ingreso.codigoQR != orden.muestra.codigoQR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "El código QR leído no corresponde a la muestra asociada a esta "
                "orden de compra."
            ),
        )

    if orden.muestra and ingreso.tipoProceso != orden.muestra.tipoProceso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"El tipo de proceso declarado ('{ingreso.tipoProceso}') no coincide "
                f"con el de la muestra ('{orden.muestra.tipoProceso}')."
            ),
        )

    if db.inventarioacopio.find_unique(where={"ordenCompraId": ingreso.ordenCompraId}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta orden de compra ya tiene un ingreso registrado en bodega.",
        )

    peso_kg = round(ingreso.pesoIngresado_lb * 0.453592, 2)

    inventario = db.inventarioacopio.create(
        data={
            "ordenCompraId": ingreso.ordenCompraId,
            "pesoIngresoKg": peso_kg,
            "pesoSalidaKg": 0.0,
            "estado": "EN_BODEGA",
        }
    )

    return {
        "mensaje": "Ingreso a bodega registrado con éxito.",
        "inventario_id": inventario.id,
        "peso_ingreso_kg": peso_kg,
        "estado": inventario.estado,
    }


@router.get("/{inventario_id}")
def obtener_inventario(
    inventario_id: int,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*BODEGA)),
):
    """Consulta el estado actual de un lote en bodega."""
    inventario = db.inventarioacopio.find_unique(where={"id": inventario_id})
    if not inventario:
        raise HTTPException(status_code=404, detail="Registro de inventario no encontrado")
    return inventario
