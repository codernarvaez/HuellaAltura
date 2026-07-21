from fastapi import APIRouter, HTTPException, status
from app.schemas.acopio import TrillaCreate
from app.database import prisma

router = APIRouter(prefix="/acopio/trilla", tags=["Acopio - Procesamiento (Trilla)"])

@router.post("/procesar")
async def procesar_balance_masa(trilla: TrillaCreate):
    """
    Calcula dinámicamente el rendimiento esperado de café oro a partir del café pergamino/bola.
    """
    # 1. Consultar el café disponible en bodega
    inventario_db = await prisma.inventarioacopio.find_unique(
        where={"id": trilla.inventarioId}
    )
    
    if not inventario_db:
        raise HTTPException(status_code=404, detail="Registro de inventario no encontrado")
        
    if inventario_db.estado != "EN_BODEGA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El lote de café ya fue procesado o despachado."
        )

    # 2. BDD: Aplicar ecuaciones fijas del requisito RS-AGR-003
    peso_entrada = inventario_db.pesoIngresoKg
    
    # Ecuación 1: kg café oro esperados = kg entrada trilla × Factor de rendimiento
    kg_oro_esperados = round(peso_entrada * trilla.factorRendimiento, 2)
    
    # Ecuación 2: Merma esperada (kg) = kg entrada trilla − kg café oro esperados
    merma_esperada = round(peso_entrada - kg_oro_esperados, 2)

    # 3. Transacción en la base de datos: Registrar la trilla y actualizar el inventario
    async with prisma.tx() as transaction:
        proceso_db = await transaction.procesotrilla.create(data={
            "inventarioId": trilla.inventarioId,
            "factorRendimiento": trilla.factorRendimiento,
            "pesoEntradaKg": peso_entrada,
            "pesoOroKg": kg_oro_esperados,
            "mermaKg": merma_esperada
        })
        
        # Actualizamos el estado del inventario para indicar que ya se transformó
        await transaction.inventarioacopio.update(
            where={"id": trilla.inventarioId},
            data={"estado": "EN_TRILLA"}
        )

    return {
        "mensaje": "Cálculo de balance de masa ejecutado y registrado con éxito",
        "resultados": {
            "peso_entrada_kg": peso_entrada,
            "factor_aplicado": trilla.factorRendimiento,
            "kg_cafe_oro_esperados": kg_oro_esperados,
            "merma_esperada_kg": merma_esperada
        },
        "proceso_id": proceso_db.id
    }