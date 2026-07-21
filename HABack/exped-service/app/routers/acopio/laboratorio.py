from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from app.database import get_db
from app.dependencies import log_user_action, require_roles
from app.routers.acopio.roles import CALIDAD
from app.schemas.acopio import AnalisisFisicoCreate, AnalisisSensorialCreate

router = APIRouter(prefix="/acopio/laboratorio", tags=["Acopio - Laboratorio"])

# Umbral SCA para clasificar como café de especialidad (RF-APE-05)
PUNTAJE_MINIMO_ESPECIALIDAD = 80.0


def clasificar(puntaje_total: float) -> str:
    return "Café de Especialidad" if puntaje_total >= PUNTAJE_MINIMO_ESPECIALIDAD else "Café Comercial"


@router.post(
    "/fisico",
    dependencies=[Depends(log_user_action("registrar_analisis_fisico"))],
)
def registrar_analisis_fisico(
    analisis: AnalisisFisicoCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*CALIDAD)),
):
    """Registra el análisis físico de la muestra (RF-APE-03)."""
    muestra_db = db.muestra.find_unique(where={"id": analisis.muestraId})
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    fisico_db = db.analisisfisico.create(
        data={
            "muestraId": analisis.muestraId,
            "humedad": analisis.humedad,
            "criba": analisis.criba,
            "densidad": analisis.densidad,
            "defectosPrim": analisis.defectosPrim,
            "defectosSec": analisis.defectosSec,
        }
    )
    return {"mensaje": "Análisis físico registrado", "id": fisico_db.id}


@router.post(
    "/sensorial",
    dependencies=[Depends(log_user_action("registrar_analisis_sensorial"))],
)
def registrar_analisis_sensorial(
    analisis: AnalisisSensorialCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*CALIDAD)),
):
    """Registra el análisis sensorial SCA y clasifica la muestra (RF-APE-04, 05)."""
    muestra_db = db.muestra.find_unique(where={"id": analisis.muestraId})
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    puntaje_total = sum(
        [
            analisis.fraganciaAroma,
            analisis.sabor,
            analisis.saborResidual,
            analisis.acidez,
            analisis.cuerpo,
            analisis.uniformidad,
            analisis.balance,
            analisis.tazaLimpia,
            analisis.dulzor,
            analisis.puntajeCatador,
        ]
    )

    sensorial_db = db.analisissensorial.create(
        data={
            "muestraId": analisis.muestraId,
            "fraganciaAroma": analisis.fraganciaAroma,
            "sabor": analisis.sabor,
            "saborResidual": analisis.saborResidual,
            "acidez": analisis.acidez,
            "cuerpo": analisis.cuerpo,
            "uniformidad": analisis.uniformidad,
            "balance": analisis.balance,
            "tazaLimpia": analisis.tazaLimpia,
            "dulzor": analisis.dulzor,
            "puntajeCatador": analisis.puntajeCatador,
            "puntajeTotal": puntaje_total,
            "nivelTueste": analisis.nivelTueste,
        }
    )

    return {
        "mensaje": "Análisis sensorial registrado",
        "puntaje_total": puntaje_total,
        "clasificacion": clasificar(puntaje_total),
        "id": sensorial_db.id,
    }
