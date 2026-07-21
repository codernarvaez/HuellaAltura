import os
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Annotated, List
from prisma import Prisma

from app.database import get_db
from app.dependencies import get_current_user, log_user_action, require_roles
from app.schemas.schemas import LaborAgricolaCreate, LaborAgricolaOut, EjecucionLaborCreate, EjecucionLaborOut
from app.services.normativa_service import NormativaService

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

router = APIRouter(prefix="/api/v1/labores", tags=["Labores Agrícolas"])

# Quién planifica y ejecuta labores en campo
_OPERADORES = ("SUPER_ADMIN", "TENANT_ADMIN", "TECNICO_CAMPO", "PRODUCTOR")
# Quién valida documentalmente los registros ejecutados (RF-PPC-10, RF-AGR-14)
_VALIDADORES = ("SUPER_ADMIN", "TENANT_ADMIN", "AUDITOR_INTERNO")


@router.post(
    "/agendar",
    response_model=LaborAgricolaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Agendar Nueva Labor Agrícola",
    description="Crea una nueva labor planeada para un mes específico en una finca.",
    dependencies=[Depends(log_user_action("agendar_labor"))],
)
def agendar_labor(
    labor_in: LaborAgricolaCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*_OPERADORES)),
):
    try:
        # Sin 'await' porque tu cliente Prisma es síncrono
        finca = db.finca.find_unique(where={"id": labor_in.finca_id})
        if not finca:
            raise HTTPException(status_code=404, detail="La finca especificada no existe")

        nueva_labor = db.laboragricola.create(
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
def obtener_calendario(
    finca_id: str,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(get_current_user),
):
    try:
        finca = db.finca.find_unique(where={"id": finca_id})
        if not finca:
            raise HTTPException(status_code=404, detail="La finca especificada no existe")

        labores_db = db.laboragricola.find_many(
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
                        "id": l.id,
                        "nombre": l.nombre,
                        "tipo_proceso": l.tipo_proceso,
                        "estado": l.estado,
                        "cantidad_proyectada": l.cantidad_proyectada
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
    description="Registra la ejecución real de una labor con insumos, herramientas y evidencia fotográfica.",
    dependencies=[Depends(log_user_action("ejecutar_labor"))],
)
def ejecutar_labor(
    labor_id: str,
    ejecucion_in: EjecucionLaborCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*_OPERADORES)),
):
    try:
        labor = db.laboragricola.find_unique(where={"id": labor_id})
        if not labor:
            raise HTTPException(status_code=404, detail="La labor especificada no existe")
        
        if labor.estado == "EJECUTADO":
            raise HTTPException(status_code=400, detail="Esta labor ya ha sido registrada como ejecutada")

        # Cambiamos 'async with' a 'with'
        with db.tx() as transaction:
            ejecucion = transaction.ejecucionlabor.create(
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

            transaction.laboragricola.update(
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
def obtener_ledger(
    finca_id: str,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(get_current_user),
):
    try:
        finca = db.finca.find_unique(where={"id": finca_id})
        if not finca:
            raise HTTPException(status_code=404, detail="La finca especificada no existe")

        ejecuciones = db.ejecucionlabor.find_many(
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
def obtener_sugerencias(
    mes: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        sugerencias = NormativaService.obtener_sugerencias(mes)
        return {"mes": mes.capitalize(), "sugerencias_disponibles": sugerencias}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/{labor_id}/validar-norma",
    summary="Pre-validar contra normativa",
    dependencies=[Depends(log_user_action("validar_norma_labor"))],
)
def validar_normativa(
    labor_id: str,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*_OPERADORES)),
):
    try:
        ejecucion = db.ejecucionlabor.find_first(
            where={"labor_id": labor_id},
            include={"insumos": True, "herramientas": True}
        )
        if not ejecucion:
            raise HTTPException(status_code=404, detail="No se encontró ejecución.")

        evaluacion = NormativaService.evaluar_cumplimiento(ejecucion)

        if evaluacion["estado_sugerido"] == "PRE_VALIDADO":
            db.laboragricola.update(
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

@router.post(
    "/{labor_id}/aprobar",
    summary="Aprobación Manual de Auditoría",
    dependencies=[Depends(log_user_action("aprobar_labor"))],
)
def aprobar_auditoria(
    labor_id: str,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*_VALIDADORES)),
):
    try:
        labor = db.laboragricola.find_unique(where={"id": labor_id})
        if not labor:
            raise HTTPException(status_code=404, detail="Labor no encontrada.")
        
        if labor.estado != "PRE_VALIDADO":
            raise HTTPException(status_code=400, detail="La labor debe estar PRE_VALIDADA por el sistema antes de la confirmación manual.")

        labor_auditada = db.laboragricola.update(
            where={"id": labor_id},
            data={"estado": "AUDITADO"}
        )
        
        return {"message": "Labor confirmada y auditada exitosamente.", "labor_id": labor_id, "estado": labor_auditada.estado}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en aprobación: {str(e)}")



@router.post(
    "/subir-evidencia",
    status_code=status.HTTP_200_OK,
    summary="Subir Foto de Evidencia",
    description="Recibe un archivo de imagen desde el móvil, lo sube a Cloudinary y devuelve la URL cruda.",
    dependencies=[Depends(log_user_action("subir_evidencia_labor"))],
)
def subir_foto_evidencia(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(*_OPERADORES)),
):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

        resultado = cloudinary.uploader.upload(file.file)
        
        foto_url = resultado.get("secure_url")
        foto_hash = resultado.get("signature") 
        
        return {
            "mensaje": "Imagen subida exitosamente",
            "foto_url": foto_url,
            "foto_hash": foto_hash
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno al subir imagen: {str(e)}")