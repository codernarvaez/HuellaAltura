from fastapi import APIRouter, HTTPException, status
from app.schemas.acopio import DespachoCreate
from app.database import prisma

router = APIRouter(prefix="/acopio/despachos", tags=["Acopio - Exportación y Despachos"])

@router.post("/registrar")
async def registrar_despacho(despacho: DespachoCreate):
    """
    Registra la salida de café aplicando el Control Algorítmico contra el Fraude de Segregación en base de datos.[cite: 2]
    """
    # 1. Consulta real a la base de datos
    inventario_db = await prisma.inventarioacopio.find_unique(
        where={"id": despacho.inventarioId}
    )
    
    if not inventario_db:
        raise HTTPException(status_code=404, detail="Registro de inventario no encontrado")

    # 2. BDD: Control Algorítmico contra el Fraude de Segregación[cite: 2]
    # Regla: Σ kg café (Salida) ≤ Σ kg café (Ingreso)[cite: 2]
    peso_ingreso_historico = inventario_db.pesoIngresoKg
    peso_salida_acumulado = inventario_db.pesoSalidaKg

    nuevo_peso_acumulado = peso_salida_acumulado + despacho.peso_salida_kg

    if nuevo_peso_acumulado > peso_ingreso_historico:
        # Bloqueo inmediato e inmutable de la guía de despacho[cite: 2]
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Alerta de Fraude: Intento de despachar {nuevo_peso_acumulado} kg. Supera la masa certificada de entrada ({peso_ingreso_historico} kg)."
        )

    # 3. Determinar si el lote se vació por completo
    estado_nuevo = "DESPACHADO" if nuevo_peso_acumulado == peso_ingreso_historico else inventario_db.estado

    # 4. Actualización real en la base de datos
    await prisma.inventarioacopio.update(
        where={"id": despacho.inventarioId},
        data={
            "pesoSalidaKg": nuevo_peso_acumulado,
            "estado": estado_nuevo
        }
    )

    return {
        "mensaje": "Despacho autorizado y registrado con éxito.",
        "peso_total_despachado": nuevo_peso_acumulado,
        "saldo_restante_bodega": round(peso_ingreso_historico - nuevo_peso_acumulado, 2),
        "estado_lote": estado_nuevo,
        "destino": despacho.destino
    }