from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated, List
from prisma import Prisma

from app.database import get_db
from app.schemas.schemas import LaborAgricolaCreate, LaborAgricolaOut, EjecucionLaborCreate, EjecucionLaborOut
from app.core import endpoints
from app.services.normativa_service import NormativaService

router = APIRouter(prefix="/api/v1/labores", tags=["Labores Agrícolas"])

@router.post(
    "/agendar",
    response_model=LaborAgricolaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Agendar Nueva Labor Agrícola",
    description="Crea una nueva labor planeada para un mes específico en una finca."
)
async def agendar_labor(
    labor_in: LaborAgricolaCreate,
    db: Annotated[Prisma, Depends(get_db)]
):
    try:
        finca = await db.finca.find_unique(where={"id": labor_in.finca_id})
        if not finca:
            raise HTTPException(status_code=404, detail="La finca especificada no existe")

        nueva_labor = await db.laboragricola.create(
            data={
                "finca_id": labor_in.finca_id,
                "nombre": labor_in.nombre,
                "tipo_proceso": labor_in.tipo_proceso,
                "mes": labor_in.mes,
                "cantidad_proyectada": labor_in.cantidad_proyectada,
                "estado": "PLANIFICADO"
            }
        )
        return nueva_labor
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno al crear labor: {str(e)}")


@router.get(
    "/calendario/{finca_id}",
    summary="Vista Calendario Anual",
    description="Muestra el calendario de 12 meses con las labores agendadas para una finca."
)
async def obtener_calendario(
    finca_id: str,
    db: Annotated[Prisma, Depends(get_db)]
):
    try:
        finca = await db.finca.find_unique(where={"id": finca_id})
        if not finca:
            raise HTTPException(status_code=404, detail="La finca especificada no existe")

        labores_db = await db.laboragricola.find_many(
            where={"finca_id": finca_id},
            order={"creado_en": "asc"}
        )

        meses_orden = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]
        
        calendario = []
        
        for mes in meses_orden:
            labores_del_mes = [l for l in labores_db if l.mes.lower() == mes.lower()]
            
            calendario.append({
                "mes": mes,
                "total_labores": len(labores_del_mes),
                "labores": [
                    {
                        "labor_id": l.id,
                        "nombre": l.nombre,
                        "tipo_proceso": l.tipo_proceso,
                        "estado": l.estado
                    } for l in labores_del_mes
                ]
            })

        return {
            "finca_id": finca_id,
            "calendario": calendario
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno al obtener calendario: {str(e)}")


@router.post(
    "/{labor_id}/ejecutar",
    response_model=EjecucionLaborOut,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Ejecución de Labor Agrícola",
    description="Registra la ejecución real de una labor con insumos, herramientas y evidencia fotográfica."
)
async def ejecutar_labor(
    labor_id: str,
    ejecucion_in: EjecucionLaborCreate,
    db: Annotated[Prisma, Depends(get_db)]
):
    try:
        labor = await db.laboragricola.find_unique(where={"id": labor_id})
        if not labor:
            raise HTTPException(status_code=404, detail="La labor especificada no existe")
        
        if labor.estado == "EJECUTADO":
            raise HTTPException(status_code=400, detail="Esta labor ya ha sido registrada como ejecutada")

        async with db.tx() as transaction:
            ejecucion = await transaction.ejecucionlabor.create(
                data={
                    "labor_id": labor_id,
                    "finca_id": labor.finca_id,
                    "persona_desarrollo": ejecucion_in.persona_desarrollo,
                    "nombre_jornalero": ejecucion_in.nombre_jornalero,
                    "detalle_aplicacion": ejecucion_in.detalle_aplicacion,
                    "salario": ejecucion_in.salario,
                    "foto_url": ejecucion_in.foto_url,
                    "foto_hash": ejecucion_in.foto_hash,
                    "latitud": ejecucion_in.latitud,
                    "longitud": ejecucion_in.longitud,
                    "insumos": {
                        "create": [
                            {
                                "nombre": insumo.nombre,
                                "cantidad": insumo.cantidad,
                                "unidad": insumo.unidad
                            } for insumo in ejecucion_in.insumos
                        ]
                    },
                    "herramientas": {
                        "create": [
                            {"nombre": herramienta} for herramienta in ejecucion_in.herramientas
                        ]
                    }
                }
            )

            await transaction.laboragricola.update(
                where={"id": labor_id},
                data={"estado": "EJECUTADO"}
            )
            
            return ejecucion

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno al registrar ejecución: {str(e)}")
    



@router.get(
    "/ledger/{finca_id}",
    summary="Ledger de Labores (Trazabilidad Completa)",
    description="Vista consolidada de todas las labores ejecutadas con trazabilidad completa para auditorías."
)
async def obtener_ledger(
    finca_id: str,
    db: Annotated[Prisma, Depends(get_db)]
):
    try:
        finca = await db.finca.find_unique(where={"id": finca_id})
        if not finca:
            raise HTTPException(status_code=404, detail="La finca especificada no existe")

        ejecuciones = await db.ejecucionlabor.find_many(
            where={"finca_id": finca_id},
            include={
                "labor": True,
                "insumos": True,
                "herramientas": True
            },
            order={"timestamp": "desc"} 
        )

        ledger = []
        for ejec in ejecuciones:
            ledger.append({
                "id_ejecucion": ejec.id,
                "fecha": ejec.timestamp,
                "actividad": ejec.labor.nombre if ejec.labor else "Desconocida",
                "tipo_proceso": ejec.labor.tipo_proceso if ejec.labor else "Desconocido",
                "persona": ejec.persona_desarrollo,
                "nombre_jornalero": ejec.nombre_jornalero,
                "detalle_aplicacion": ejec.detalle_aplicacion,
                "costo": ejec.salario,
                "evidencia": {
                    "foto_url": ejec.foto_url,
                    "foto_hash": ejec.foto_hash,
                    "ubicacion": {
                        "latitud": ejec.latitud,
                        "longitud": ejec.longitud
                    }
                },
                "insumos": [
                    {
                        "nombre": i.nombre, 
                        "cantidad": i.cantidad, 
                        "unidad": i.unidad
                    } for i in ejec.insumos
                ] if ejec.insumos else [],
                "herramientas": [h.nombre for h in ejec.herramientas] if ejec.herramientas else [],
                "estado": "AUDITADO" if ejec.labor and ejec.labor.estado == "AUDITADO" else "REGISTRADO"
            })
        
        return {
            "finca_id": finca_id,
            "total_registros": len(ledger),
            "ledger": ledger
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno al obtener el ledger: {str(e)}")
    

@router.get("/sugerencias/{mes}", summary="Sugerencias Parametrizadas")
async def obtener_sugerencias(mes: str):
    try:
        sugerencias = NormativaService.obtener_sugerencias(mes)
        return {"mes": mes.capitalize(), "sugerencias_disponibles": sugerencias}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{labor_id}/validar-norma", summary="Pre-validar contra normativa")
async def validar_normativa(labor_id: str, db: Annotated[Prisma, Depends(get_db)]):
    try:
        ejecucion = await db.ejecucionlabor.find_first(
            where={"labor_id": labor_id},
            include={"insumos": True, "herramientas": True}
        )
        if not ejecucion:
            raise HTTPException(status_code=404, detail="No se encontró ejecución.")

        evaluacion = NormativaService.evaluar_cumplimiento(ejecucion)

        if evaluacion["estado_sugerido"] == "PRE_VALIDADO":
            await db.laboragricola.update(
                where={"id": labor_id},
                data={"estado": "PRE_VALIDADO"}
            )

        return {
            "labor_id": labor_id,
            "estado_validacion": evaluacion["estado_sugerido"],
            "detalles": evaluacion["detalles"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.post("/{labor_id}/aprobar", summary="Aprobación Manual de Auditoría")
async def aprobar_auditoria(labor_id: str, db: Annotated[Prisma, Depends(get_db)]):
    try:
        labor = await db.laboragricola.find_unique(where={"id": labor_id})
        if not labor:
            raise HTTPException(status_code=404, detail="Labor no encontrada.")
        
        if labor.estado != "PRE_VALIDADO":
            raise HTTPException(status_code=400, detail="La labor debe estar PRE_VALIDADA por el sistema antes de la confirmación manual.")

        labor_auditada = await db.laboragricola.update(
            where={"id": labor_id},
            data={"estado": "AUDITADO"}
        )
        
        return {"message": "Labor confirmada y auditada exitosamente.", "labor_id": labor_id, "estado": labor_auditada.estado}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en aprobación: {str(e)}")