from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from app.database import get_db
from app.dependencies import get_current_user, log_user_action
from app.schemas.schemas import (
    FincaCreate, 
    ExpedienteCreate, 
    DatoAgroambientalCreate, 
    VariableDinamicaCreate,
    FincaOut,
    ExpedienteOut,
    DatoAgroambientalOut,
    VariableDinamicaOut
)

router = APIRouter()

# --- Esquemas de Sincronización ---

class SyncFinca(FincaCreate):
    id: str  # Obligatorio para offline (UUID generado por el móvil)

class SyncExpediente(ExpedienteCreate):
    id: str

class SyncDato(DatoAgroambientalCreate):
    id: str

class SyncVariable(VariableDinamicaCreate):
    id: Optional[int] = None
    local_id: str  # ID temporal del móvil para mapeo si es necesario

class SyncPayload(BaseModel):
    fincas: List[SyncFinca] = []
    expedientes: List[SyncExpediente] = []
    datos_agroambientales: List[SyncDato] = []
    variables_dinamicas: List[SyncVariable] = []

class SyncResponse(BaseModel):
    status: str
    synchronized_counts: dict
    timestamp: datetime

# --- Endpoint de Sincronización ---

@router.post(
    "/upload",
    response_model=SyncResponse,
    summary="Sincronización masiva desde App Móvil (Modo Offline)",
    dependencies=[Depends(log_user_action("sync_upload"))],
)
async def sync_upload(
    payload: SyncPayload,
    db: Prisma = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Recibe un paquete de datos recolectados offline y los sincroniza con la nube.
    Usa lógica de 'Upsert' para evitar duplicados si se reintenta la conexión.
    """
    user_id = current_user.get("sub")
    counts = {"fincas": 0, "expedientes": 0, "datos": 0, "variables": 0}

    # Usamos una transacción para asegurar integridad
    async with db.tx() as transaction:

        # 1. Sincronizar Fincas
        for finca in payload.fincas:
            # Forzamos que la finca pertenezca al usuario si es rol PRODUCTOR
            # usuario_id vincula la finca al usuario (que tiene rol PRODUCTOR en auth-service)
            u_id = user_id if current_user.get("role") == "PRODUCTOR" else finca.usuario_id

            finca_data = finca.model_dump()
            finca_data["usuario_id"] = u_id

            await transaction.finca.upsert(
                where={"id": finca.id},
                data={
                    "create": finca_data,
                    "update": {k: v for k, v in finca_data.items() if k not in ["id"]}
                }
            )
            counts["fincas"] += 1

        # 2. Sincronizar Datos Agroambientales (ANTES que Expedientes)
        for dato in payload.datos_agroambientales:
            await transaction.dato.upsert(
                where={"id": dato.id},
                data={
                    "create": dato.model_dump(exclude={"variables"}),
                    "update": dato.model_dump(exclude={"id", "variables"})
                }
            )
            counts["datos"] += 1

        # 3. Sincronizar Expedientes (DESPUÉS de Datos)
        for exp in payload.expedientes:
            # Expediente necesita dato_id (que vincula a Dato que vincula a Finca)
            exp_data = exp.model_dump()

            await transaction.expediente.upsert(
                where={"id": exp.id},
                data={
                    "create": exp_data,
                    "update": {k: v for k, v in exp_data.items() if k not in ["id"]}
                }
            )
            counts["expedientes"] += 1

        # 4. Sincronizar Variables Dinámicas
        for var in payload.variables_dinamicas:
            # Aquí no usamos ID ya que suelen ser autoincrementales, 
            # pero filtramos por dato_id y nombre para evitar duplicados
            existing = await transaction.variabledinamica.find_first(
                where={"dato_id": var.dato_id, "nombre": var.nombre}
            )
            
            if existing:
                await transaction.variabledinamica.update(
                    where={"id": existing.id},
                    data=var.model_dump()
                )
            else:
                await transaction.variabledinamica.create(
                    data=var.model_dump()
                )
            counts["variables"] += 1

    return SyncResponse(
        status="success",
        synchronized_counts=counts,
        timestamp=datetime.now()
    )
