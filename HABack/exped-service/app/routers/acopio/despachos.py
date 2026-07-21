from fastapi import APIRouter, HTTPException, status, Depends
from prisma import Prisma
from datetime import datetime
from app.schemas.acopio import DespachoCreate
from app.database import get_db
from fastapi.responses import StreamingResponse
from app.utils.pdf_generator import generar_certificado_pdf

router = APIRouter(prefix="/acopio/despachos", tags=["Acopio - Exportación y Despachos"])

@router.post("/registrar")
def registrar_despacho(despacho: DespachoCreate, db: Prisma = Depends(get_db)):
    inventario_db = db.inventarioacopio.find_unique(where={"id": despacho.inventarioId})

    if not inventario_db:
        raise HTTPException(status_code=404, detail="Registro de inventario no encontrado")

    peso_ingreso_historico = inventario_db.pesoIngresoKg
    peso_salida_acumulado = inventario_db.pesoSalidaKg

    nuevo_peso_acumulado = peso_salida_acumulado + despacho.peso_salida_kg

    if nuevo_peso_acumulado > peso_ingreso_historico:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Alerta de Fraude: Intento de despachar {nuevo_peso_acumulado} kg. Supera la masa certificada de entrada ({peso_ingreso_historico} kg)."
        )

    estado_nuevo = "DESPACHADO" if nuevo_peso_acumulado == peso_ingreso_historico else inventario_db.estado

    db.inventarioacopio.update(
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
def generar_certificado_trazabilidad(inventario_id: int, db: Prisma = Depends(get_db)):
    inventario = db.inventarioacopio.find_unique(
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

    finca = db.finca.find_unique(where={"id": muestra.fincaId})

    auditoria = db.auditoria.find_first(
        where={
            "expediente": {
                "dato": {
                    "finca_id": muestra.fincaId
                }
            }
        },
        order={"fecha_auditoria": "desc"}
    )

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

@router.get("/certificado/{inventario_id}/pdf")
def descargar_certificado_pdf(inventario_id: int, db: Prisma = Depends(get_db)):
    datos = obtener_datos_trazabilidad(inventario_id, db)

    pdf_buffer = generar_certificado_pdf(datos)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificado_{inventario_id}.pdf"}
    )