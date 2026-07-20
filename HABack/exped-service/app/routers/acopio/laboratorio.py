from fastapi import APIRouter, HTTPException
from app.schemas.acopio import AnalisisSensorialCreate, AnalisisFisicoCreate
from app.database import prisma

router = APIRouter(prefix="/acopio/laboratorio", tags=["Acopio - Laboratorio"])

@router.post("/fisico")
async def registrar_analisis_fisico(analisis: AnalisisFisicoCreate):
    muestra_db = await prisma.muestra.find_unique(where={"id": analisis.muestraId})
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    fisico_db = await prisma.analisisfisico.create(data={
        "muestraId": analisis.muestraId,
        "humedad": analisis.humedad,
        "criba": analisis.criba,
        "densidad": analisis.densidad,
        "defectosPrim": analisis.defectosPrim,
        "defectosSec": analisis.defectosSec
    })
    return {"mensaje": "Análisis físico registrado", "id": fisico_db.id}


@router.post("/sensorial")
async def registrar_analisis_sensorial(analisis: AnalisisSensorialCreate):
    muestra_db = await prisma.muestra.find_unique(where={"id": analisis.muestraId})
    if not muestra_db:
        raise HTTPException(status_code=404, detail="Muestra no encontrada")

    # Lógica funcional real: suma de atributos SCA
    puntaje_total = sum([
        analisis.fraganciaAroma, analisis.sabor, analisis.saborResidual,
        analisis.acidez, analisis.cuerpo, analisis.uniformidad,
        analisis.balance, analisis.tazaLimpia, analisis.dulzor,
        analisis.puntajeCatador
    ])
    
    # Inserción real en BD
    sensorial_db = await prisma.analisissensorial.create(data={
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

    clasificacion = "Café de Especialidad" if puntaje_total >= 80.0 else "Café Comercial"[cite: 1, 2]

    return {
        "mensaje": "Análisis sensorial registrado",
        "puntaje_total": puntaje_total,
        "clasificacion": clasificacion,
        "id": sensorial_db.id
    }