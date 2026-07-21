from fastapi import APIRouter, HTTPException, Depends
from prisma import Prisma
from app.schemas.acopio import AnalisisSensorialCreate, AnalisisFisicoCreate
from app.database import get_db

router = APIRouter(prefix="/acopio/laboratorio", tags=["Acopio - Laboratorio"])

@router.post("/fisico")
def registrar_analisis_fisico(analisis: AnalisisFisicoCreate, db: Prisma = Depends(get_db)):
    muestra_db = db.muestra.find_unique(where={"id": analisis.muestraId})
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    fisico_db = db.analisisfisico.create(data={
        "muestraId": analisis.muestraId,
        "humedad": analisis.humedad,
        "criba": analisis.criba,
        "densidad": analisis.densidad,
        "defectosPrim": analisis.defectosPrim,
        "defectosSec": analisis.defectosSec
    })
    return {"mensaje": "Análisis físico registrado", "id": fisico_db.id}


@router.post("/sensorial")
def registrar_analisis_sensorial(analisis: AnalisisSensorialCreate, db: Prisma = Depends(get_db)):
    muestra_db = db.muestra.find_unique(where={"id": analisis.muestraId})
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    puntaje_total = sum([
        analisis.fraganciaAroma, analisis.sabor, analisis.saborResidual,
        analisis.acidez, analisis.cuerpo, analisis.uniformidad,
        analisis.balance, analisis.tazaLimpia, analisis.dulzor,
        analisis.puntajeCatador
    ])

    sensorial_db = db.analisissensorial.create(data={
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
        "nivelTueste": analisis.nivelTueste
    })

    clasificacion = "Café de Especialidad" if puntaje_total >= 80.0 else "Café Comercial"

    return {
        "mensaje": "Análisis sensorial registrado",
        "puntaje_total": puntaje_total,
        "clasificacion": clasificacion,
        "id": sensorial_db.id
    }