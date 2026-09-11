from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma

from app.database import get_db
from app.dependencies import log_user_action, require_roles
from app.routers.acopio.roles import BODEGA
from app.schemas.acopio import TrillaCreate

router = APIRouter(prefix="/acopio/trilla", tags=["Acopio - Procesamiento (Trilla)"])


@router.post(
    "/procesar",
    dependencies=[Depends(log_user_action("procesar_trilla"))],
)
def procesar_balance_masa(
    trilla: TrillaCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*BODEGA)),
):
    """
    Calcula dinámicamente el rendimiento esperado de café oro a partir del café
    pergamino/bola, aplicando el balance de masas (RS-AGR-003).
    """
    inventario_db = db.inventarioacopio.find_unique(where={"id": trilla.inventarioId})

    if not inventario_db:
        raise HTTPException(status_code=404, detail="Registro de inventario no encontrado")

    if inventario_db.estado != "EN_BODEGA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El lote de café ya fue procesado o despachado.",
        )

    peso_entrada = inventario_db.pesoIngresoKg

    # kg café oro esperados = kg entrada trilla × factor de rendimiento
    kg_oro_esperados = round(peso_entrada * trilla.factorRendimiento, 2)
    # merma esperada (kg) = kg entrada trilla − kg café oro esperados
    merma_esperada = round(peso_entrada - kg_oro_esperados, 2)

    with db.tx() as transaction:
        proceso_db = transaction.procesotrilla.create(
            data={
                "inventarioId": trilla.inventarioId,
                "factorRendimiento": trilla.factorRendimiento,
                "pesoEntradaKg": peso_entrada,
                "pesoOroKg": kg_oro_esperados,
                "mermaKg": merma_esperada,
            }
        )

        transaction.inventarioacopio.update(
            where={"id": trilla.inventarioId},
            data={"estado": "EN_TRILLA"},
        )

        proceso_id = proceso_db.id

    return {
        "mensaje": "Cálculo de balance de masa ejecutado y registrado con éxito",
        "resultados": {
            "peso_entrada_kg": peso_entrada,
            "factor_aplicado": trilla.factorRendimiento,
            "kg_cafe_oro_esperados": kg_oro_esperados,
            "merma_esperada_kg": merma_esperada,
        },
        "proceso_id": proceso_id,
    }
