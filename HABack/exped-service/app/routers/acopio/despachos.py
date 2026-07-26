from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from prisma import Prisma
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import log_user_action, require_roles, get_current_user
from app.routers.acopio.laboratorio import clasificar
from app.routers.acopio.roles import CONSULTA, GERENCIA
from app.schemas.acopio import DespachoCreate, InventarioAcopioOut
from app.utils.pdf_generator import generar_certificado_pdf


class DespachoHistorialOut(BaseModel):
    """Historial de despachos con información de trazabilidad."""
    id: str
    ordenCompraId: str
    pesoIngresoKg: float
    pesoSalidaKg: float
    estado: str

    class Config:
        from_attributes = True


router = APIRouter(prefix="/acopio/despachos", tags=["Acopio - Exportación y Despachos"])


@router.get(
    "/",
    response_model=list[DespachoHistorialOut],
    summary="Listar historial de todos los despachos",
)
def listar_despachos(
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*CONSULTA)),
):
    """
    Obtiene el historial completo de despachos registrados.

    **Retorna:**
    - Lista de todos los despachos con: ID inventario, peso ingreso, peso salida, estado actual
    - Ordena por más recientes primero
    - Incluye despachos parciales y completos para auditoría

    **Caso de Uso:**
    - Auditar trazabilidad de exportación
    - Verificar control antifraude (kg salida ≤ kg ingreso)
    - Generar reportes de movimiento en bodega
    """
    despachos = db.inventarioacopio.find_many(
        where={"pesoSalidaKg": {"gt": 0}},
        include={"ordenCompra": True},
        order={"id": "desc"}
    )
    return despachos


def obtener_datos_trazabilidad(db: Prisma, inventario_id: int) -> dict:
    """
    Reconstruye el pasaporte consolidado de trazabilidad de un lote:
    Muestra -> Laboratorio -> EUDR -> Trilla -> Despacho.

    Es la fuente única tanto de la respuesta JSON como del PDF descargable.
    """
    inventario = db.inventarioacopio.find_unique(
        where={"id": inventario_id},
        include={
            "ordenCompra": {
                "include": {
                    "muestra": {
                        "include": {
                            "analisisFisico": True,
                            "analisisSensorial": True,
                        }
                    }
                }
            },
            "procesoTrilla": True,
        },
    )

    if not inventario or not inventario.ordenCompra:
        raise HTTPException(
            status_code=404, detail="Cadena de trazabilidad incompleta o no encontrada"
        )

    muestra = inventario.ordenCompra.muestra

    finca = db.finca.find_unique(where={"id": muestra.fincaId})
    auditoria = db.auditoria.find_first(
        where={"expediente": {"dato": {"finca_id": muestra.fincaId}}},
        order={"fecha_auditoria": "desc"},
    )

    puntaje_sca = muestra.analisisSensorial.puntajeTotal if muestra.analisisSensorial else 0.0

    return {
        "identificador_trazabilidad": f"HA-DDS-{inventario.id}-{muestra.codigoQR}",
        "fecha_emision": datetime.now().isoformat(),
        "origen": {
            "productor_id": muestra.productorId,
            "finca_id": muestra.fincaId,
            "finca_nombre": finca.nombre if finca else "No registrada",
        },
        "cumplimiento_eudr": {
            "aprobado_cero_deforestacion": inventario.ordenCompra.aprobadoEUDR,
            "fecha_analisis_satelital": (
                auditoria.fecha_auditoria.isoformat() if auditoria else "N/A"
            ),
        },
        "perfil_calidad": {
            "clasificacion": clasificar(puntaje_sca),
            "puntaje_sca": puntaje_sca,
            "humedad_fisica": (
                muestra.analisisFisico.humedad if muestra.analisisFisico else "N/A"
            ),
        },
        "rendimiento_industrial": {
            "peso_ingreso_pergamino_kg": inventario.pesoIngresoKg,
            "factor_trilla": (
                inventario.procesoTrilla.factorRendimiento
                if inventario.procesoTrilla
                else "No trillado"
            ),
            "peso_oro_exportable_kg": (
                inventario.procesoTrilla.pesoOroKg
                if inventario.procesoTrilla
                else "No calculado"
            ),
        },
        "estado_despacho": {
            "kg_autorizados_salida": inventario.pesoSalidaKg,
            "estado_bodega": inventario.estado,
        },
    }


@router.post(
    "/registrar",
    dependencies=[Depends(log_user_action("registrar_despacho"))],
)
def registrar_despacho(
    despacho: DespachoCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*GERENCIA)),
):
    """
    Registra la salida de café aplicando el control algorítmico contra el fraude
    de segregación: Σ kg salida ≤ Σ kg ingreso.
    """
    inventario_db = db.inventarioacopio.find_unique(where={"id": despacho.inventarioId})

    if not inventario_db:
        raise HTTPException(status_code=404, detail="Registro de inventario no encontrado")

    peso_ingreso_historico = inventario_db.pesoIngresoKg
    nuevo_peso_acumulado = round(inventario_db.pesoSalidaKg + despacho.peso_salida_kg, 2)

    if nuevo_peso_acumulado > peso_ingreso_historico:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Alerta de Fraude: Intento de despachar {nuevo_peso_acumulado} kg. "
                f"Supera la masa certificada de entrada ({peso_ingreso_historico} kg)."
            ),
        )

    estado_nuevo = (
        "DESPACHADO" if nuevo_peso_acumulado == peso_ingreso_historico else inventario_db.estado
    )

    db.inventarioacopio.update(
        where={"id": despacho.inventarioId},
        data={"pesoSalidaKg": nuevo_peso_acumulado, "estado": estado_nuevo},
    )

    return {
        "mensaje": "Despacho autorizado y registrado con éxito.",
        "peso_total_despachado": nuevo_peso_acumulado,
        "saldo_restante_bodega": round(peso_ingreso_historico - nuevo_peso_acumulado, 2),
        "estado_lote": estado_nuevo,
        "destino": despacho.destino,
    }


@router.get("/certificado/{inventario_id}")
def generar_certificado_trazabilidad(
    inventario_id: int,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*CONSULTA)),
):
    """Devuelve el pasaporte consolidado de trazabilidad en JSON."""
    return {
        "mensaje": "Certificado de trazabilidad consolidado con éxito.",
        "datos_certificado": obtener_datos_trazabilidad(db, inventario_id),
    }


@router.get("/certificado/{inventario_id}/pdf")
def descargar_certificado_pdf(
    inventario_id: int,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*CONSULTA)),
):
    """Descarga el mismo certificado consolidado como PDF imprimible."""
    datos = obtener_datos_trazabilidad(db, inventario_id)
    pdf_buffer = generar_certificado_pdf(datos)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=certificado_{inventario_id}.pdf"
        },
    )
