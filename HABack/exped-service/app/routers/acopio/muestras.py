from fastapi import APIRouter, HTTPException
from app.schemas.acopio import MuestraCreate
from app.database import prisma

router = APIRouter(prefix="/acopio/muestras", tags=["Acopio - Muestras"])

@router.post("/")
async def registrar_muestra(muestra: MuestraCreate):
    # Verificamos que la finca exista
    finca_db = await prisma.finca.find_unique(where={"id": str(muestra.fincaId)})
    if not finca_db:
        raise HTTPException(status_code=404, detail="Finca no encontrada")

    # Inserción real en BD
    muestra_db = await prisma.muestra.create(data={
        "fincaId": str(muestra.fincaId),
        "productorId": str(muestra.productorId),
        "codigoQR": muestra.codigoQR,
        "tipoProceso": muestra.tipoProceso,
        "pesoKg": round(muestra.peso_lb * 0.453592, 2), # Pasando de lb a kg
        "evidenciaFoto": "url_de_la_foto_aqui" # Aquí luego conectas tu servicio de storage
    })

    return {
        "mensaje": "Muestra registrada exitosamente",
        "muestra_id": muestra_db.id
    }