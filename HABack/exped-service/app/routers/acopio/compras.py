from fastapi import APIRouter, HTTPException, status
from app.schemas.acopio import OrdenCompraCreate
from app.database import prisma

router = APIRouter(prefix="/acopio/compras", tags=["Acopio - Órdenes de Compra"])

@router.post("/aprobar")
async def registrar_orden_compra(orden: OrdenCompraCreate):
    # 1. Consulta real a la base de datos para la muestra
    muestra_db = await prisma.muestra.find_unique(
        where={"id": orden.muestraId}
    )
    
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    # 2. BDD: Validación real de elegibilidad EUDR consultando las Auditorías satelitales
    auditoria_db = await prisma.auditoria.find_first(
        where={
            "expediente": {
                "dato": {
                    "finca_id": muestra_db.fincaId
                }
            }
        },
        order={"fecha_auditoria": "desc"} # Trae la auditoría más reciente
    )

    # 3. Lógica del "Semáforo EUDR"
    finca_cumple_eudr = False
    if auditoria_db and auditoria_db.resultado == "APROBADO" and not auditoria_db.deforestacion_detectada:
        finca_cumple_eudr = True

    if not finca_cumple_eudr:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación rechazada: La finca asociada no tiene una auditoría EUDR aprobada o se detectó deforestación post-2020."
        )

    # 4. Creación real de la orden de compra
    orden_db = await prisma.ordencompra.create(data={
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