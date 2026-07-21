from fastapi import APIRouter, HTTPException, status, Depends
from prisma import Prisma
from app.schemas.acopio import TrillaCreate
from app.database import get_db

router = APIRouter(prefix="/acopio/trilla", tags=["Acopio - Procesamiento (Trilla)"])

@router.post("/procesar")
def procesar_balance_masa(trilla: TrillaCreate, db: Prisma = Depends(get_db)):
    inventario_db = db.inventarioacopio.find_unique(where={"id": trilla.inventarioId})

    if not inventario_db:
        raise HTTPException(status_code=404, detail="Registro de inventario no encontrado")

    if inventario_db.estado != "EN_BODEGA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El lote de café ya fue procesado o despachado."
        )

    peso_entrada = inventario_db.pesoIngresoKg
    kg_oro_esperados = round(peso_entrada * trilla.factorRendimiento, 2)
    merma_esperada = round(peso_entrada - kg_oro_esperados, 2)

    proceso_db = db.procesotrilla.create(data={
        "inventarioId": trilla.inventarioId,
        "factorRendimiento": trilla.factorRendimiento,
        "pesoEntradaKg": peso_entrada,
        "pesoOroKg": kg_oro_esperados,
        "mermaKg": merma_esperada
    })

    db.inventarioacopio.update(
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