from fastapi import APIRouter, HTTPException, status, Depends
from prisma import Prisma
from app.schemas.acopio import OrdenCompraCreate
from app.database import get_db

router = APIRouter(prefix="/acopio/compras", tags=["Acopio - Órdenes de Compra"])

@router.post("/aprobar")
def registrar_orden_compra(orden: OrdenCompraCreate, db: Prisma = Depends(get_db)):
    muestra_db = db.muestra.find_unique(where={"id": orden.muestraId})

    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    auditoria_db = db.auditoria.find_first(
        where={
            "expediente": {
                "dato": {
                    "finca_id": muestra_db.fincaId
                }
            }
        },
        order={"fecha_auditoria": "desc"}
    )

    finca_cumple_eudr = False
    if auditoria_db and auditoria_db.resultado == "APROBADO" and not auditoria_db.deforestacion_detectada:
        finca_cumple_eudr = True

    if not finca_cumple_eudr:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación rechazada: La finca asociada no tiene una auditoría EUDR aprobada o se detectó deforestación post-2020."
        )

    orden_db = db.ordencompra.create(data={
        "muestraId": orden.muestraId,
        "precioAcordado": orden.precioAcordado,
        "volumenKg": orden.volumenKg,
        "primas": orden.primas or 0.0,
        "aprobadoEUDR": True,
        "estado": "APROBADA"
    })

    return {
        "mensaje": "Orden de compra autorizada exitosamente. Cumplimiento EUDR verificado.",
        "orden_id": orden_db.id
    }