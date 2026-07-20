from fastapi import APIRouter, HTTPException, status
from app.schemas.acopio import OrdenCompraCreate
from app.database import prisma

router = APIRouter(prefix="/acopio/compras", tags=["Acopio - Órdenes de Compra"])

@router.post("/aprobar")
async def registrar_orden_compra(orden: OrdenCompraCreate):
    # 1. Consulta real a la base de datos
    muestra_db = await prisma.muestra.find_unique(
        where={"id": orden.muestraId}
    )
    
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    # 2. Validación de EUDR (Aquí luego lo cruzaremos con tu tabla Expediente/Auditoria)
    # Por ahora lo exigimos como verdadero para el registro funcional
    finca_cumple_eudr = True  
    
    if not finca_cumple_eudr:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación rechazada: La finca asociada no cumple con los criterios EUDR."
        )

    # 3. Creación real de la orden de compra
    orden_db = await prisma.ordencompra.create(data={
        "muestraId": orden.muestraId,
        "precioAcordado": orden.precioAcordado,
        "volumenKg": orden.volumenKg,
        "primas": orden.primas or 0.0,
        "aprobadoEUDR": True,
        "estado": "APROBADA"
    })

    return {
        "mensaje": "Orden de compra autorizada exitosamente.",
        "orden_id": orden_db.id
    }