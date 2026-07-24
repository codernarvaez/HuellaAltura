from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from app.database import get_db
from app.dependencies import log_user_action, require_roles
from app.routers.acopio.roles import ANALISIS_FISICO, CATACION
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
    current_user: dict = Depends(require_roles(*ANALISIS_FISICO)),
):
    """Registra el análisis físico de la muestra (RF-APE-03).

    Una medición fuera de umbral **se registra igualmente** y se marca como no
    conforme. Rechazarla con 422 dejaría al laboratorio sin forma de documentar
    un lote defectuoso, que es precisamente lo que la trazabilidad debe probar.
    """
    muestra_db = db.muestra.find_unique(where={"id": analisis.muestraId})
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    no_conformidades = analisis.evaluar_conformidad()

    fisico_db = db.analisisfisico.create(
        data={
            "muestraId": analisis.muestraId,
            "humedad": analisis.humedad,
            "criba": analisis.criba,
            "densidad": analisis.densidad,
            "defectosPrim": analisis.defectosPrim,
            "defectosSec": analisis.defectosSec,
            "conforme": not no_conformidades,
            "noConformidades": no_conformidades,
        }
    )

    return {
        "mensaje": "Análisis físico registrado",
        "id": fisico_db.id,
        "conforme": not no_conformidades,
        "no_conformidades": no_conformidades,
    }


@router.post(
    "/sensorial",
    dependencies=[Depends(log_user_action("registrar_analisis_sensorial"))],
)
def registrar_analisis_sensorial(
    analisis: AnalisisSensorialCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*CATACION)),
):
    """Registra la catación SCA y clasifica la muestra (RF-APE-04, RF-APE-05)."""
    muestra_db = db.muestra.find_unique(where={"id": analisis.muestraId})
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    puntaje_total = analisis.puntaje_final()

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
            "defectos": analisis.defectos,
            "puntajeTotal": puntaje_total,
            "nivelTueste": analisis.nivelTueste,
        }
    )

    return {
        "mensaje": "Análisis sensorial registrado",
        "puntaje_atributos": round(puntaje_total + analisis.defectos, 2),
        "penalizacion_defectos": analisis.defectos,
        "puntaje_total": puntaje_total,
        "clasificacion": clasificar(puntaje_total),
        "id": sensorial_db.id,
    }


@router.get("/fisico/{muestraId}")
def obtener_analisis_fisico(
    muestraId: str,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*ANALISIS_FISICO)),
):
    """Obtiene el análisis físico de una muestra (RF-APE-03)."""
    fisico = db.analisisfisico.find_unique(where={"muestraId": muestraId})
    if not fisico:
        raise HTTPException(status_code=404, detail="Análisis físico no encontrado")

    return {
        "id": fisico.id,
        "muestraId": fisico.muestraId,
        "humedad": fisico.humedad,
        "criba": fisico.criba,
        "densidad": fisico.densidad,
        "defectosPrim": fisico.defectosPrim,
        "defectosSec": fisico.defectosSec,
        "conforme": fisico.conforme,
        "noConformidades": fisico.noConformidades,
        "fechaAnalisis": fisico.fechaAnalisis,
    }


@router.get("/sensorial/{muestraId}")
def obtener_analisis_sensorial(
    muestraId: str,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*CATACION)),
):
    """Obtiene el análisis sensorial (catación SCA) de una muestra (RF-APE-04)."""
    sensorial = db.analisissensorial.find_unique(where={"muestraId": muestraId})
    if not sensorial:
        raise HTTPException(status_code=404, detail="Análisis sensorial no encontrado")

    return {
        "id": sensorial.id,
        "muestraId": sensorial.muestraId,
        "fraganciaAroma": sensorial.fraganciaAroma,
        "sabor": sensorial.sabor,
        "saborResidual": sensorial.saborResidual,
        "acidez": sensorial.acidez,
        "cuerpo": sensorial.cuerpo,
        "uniformidad": sensorial.uniformidad,
        "balance": sensorial.balance,
        "tazaLimpia": sensorial.tazaLimpia,
        "dulzor": sensorial.dulzor,
        "puntajeCatador": sensorial.puntajeCatador,
        "defectos": sensorial.defectos,
        "puntajeTotal": sensorial.puntajeTotal,
        "clasificacion": clasificar(sensorial.puntajeTotal),
        "nivelTueste": sensorial.nivelTueste,
        "fechaAnalisis": sensorial.fechaAnalisis,
    }
