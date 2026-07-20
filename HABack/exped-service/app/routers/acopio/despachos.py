from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from app.schemas.acopio import DespachoCreate
from app.database import prisma

router = APIRouter(prefix="/acopio/despachos", tags=["Acopio - Exportación y Despachos"])

@router.post("/registrar")
async def registrar_despacho(despacho: DespachoCreate):
    """
    Registra la salida de café aplicando el Control Algorítmico contra el Fraude de Segregación en base de datos.
    """
    # 1. Consulta real a la base de datos
    inventario_db = await prisma.inventarioacopio.find_unique(
        where={"id": despacho.inventarioId}
    )
    
    if not inventario_db:
        raise HTTPException(status_code=404, detail="Registro de inventario no encontrado")

    # 2. BDD: Control Algorítmico contra el Fraude de Segregación
    # Regla: Σ kg café (Salida) ≤ Σ kg café (Ingreso)
    peso_ingreso_historico = inventario_db.pesoIngresoKg
    peso_salida_acumulado = inventario_db.pesoSalidaKg

    nuevo_peso_acumulado = peso_salida_acumulado + despacho.peso_salida_kg

    if nuevo_peso_acumulado > peso_ingreso_historico:
        # Bloqueo inmediato e inmutable de la guía de despacho
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


@router.get("/certificado/{inventario_id}")
async def generar_certificado_trazabilidad(inventario_id: int):
    """
    Genera el pasaporte consolidado de trazabilidad (Muestra -> Laboratorio -> EUDR -> Trilla -> Despacho).
    """
    # 1. Consulta anidada de Prisma para traer toda la cadena desde el inventario hacia atrás
    inventario = await prisma.inventarioacopio.find_unique(
        where={"id": inventario_id},
        include={
            "ordenCompra": {
                "include": {
                    "muestra": {
                        "include": {
                            "analisisFisico": True,
                            "analisisSensorial": True
                        }
                    }
                }
            },
            "procesoTrilla": True
        }
    )

    if not inventario or not inventario.ordenCompra:
        raise HTTPException(status_code=404, detail="Cadena de trazabilidad incompleta o no encontrada")

    muestra = inventario.ordenCompra.muestra

    # 2. Consultar información de la Finca y la Auditoría Satelital
    finca = await prisma.finca.find_unique(where={"id": muestra.fincaId})
    
    auditoria = await prisma.auditoria.find_first(
        where={
            "expediente": {
                "dato": {
                    "finca_id": muestra.fincaId
                }
            }
        },
        order={"fecha_auditoria": "desc"}
    )

    # 3. Estructurar el Certificado Consolidado
    puntaje_sca = muestra.analisisSensorial.puntajeTotal if muestra.analisisSensorial else 0.0

    certificado = {
        "identificador_trazabilidad": f"HA-DDS-{inventario.id}-{muestra.codigoQR}",
        "fecha_emision": datetime.now().isoformat(),
        "origen": {
            "productor_id": muestra.productorId,
            "finca_id": muestra.fincaId,
            "finca_nombre": finca.nombre if finca else "No registrada",
        },
        "cumplimiento_eudr": {
            "aprobado_cero_deforestacion": inventario.ordenCompra.aprobadoEUDR,
            "fecha_analisis_satelital": auditoria.fecha_auditoria.isoformat() if auditoria else "N/A",
        },
        "perfil_calidad": {
            "clasificacion": "Café de Especialidad" if puntaje_sca >= 80.0 else "Café Comercial",
            "puntaje_sca": puntaje_sca,
            "humedad_fisica": muestra.analisisFisico.humedad if muestra.analisisFisico else "N/A"
        },
        "rendimiento_industrial": {
            "peso_ingreso_pergamino_kg": inventario.pesoIngresoKg,
            "factor_trilla": inventario.procesoTrilla.factorRendimiento if inventario.procesoTrilla else "No trillado",
            "peso_oro_exportable_kg": inventario.procesoTrilla.pesoOroKg if inventario.procesoTrilla else "No calculado"
        },
        "estado_despacho": {
            "kg_autorizados_salida": inventario.pesoSalidaKg,
            "estado_bodega": inventario.estado
        }
    }

    return {
        "mensaje": "Certificado de trazabilidad consolidado con éxito.",
        "datos_certificado": certificado
    }