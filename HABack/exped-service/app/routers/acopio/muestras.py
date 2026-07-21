from fastapi import APIRouter, HTTPException, Depends
from prisma import Prisma
from app.schemas.acopio import MuestraCreate
from app.database import get_db

router = APIRouter(prefix="/acopio/muestras", tags=["Acopio - Muestras"])

@router.post("/")
def registrar_muestra(muestra: MuestraCreate, db: Prisma = Depends(get_db)):
    finca_db = db.finca.find_unique(where={"id": str(muestra.fincaId)})
    if not finca_db:
        raise HTTPException(status_code=404, detail="Finca no encontrada")

    muestra_db = db.muestra.create(data={
        "fincaId": str(muestra.fincaId),
        "productorId": str(muestra.productorId),
        "codigoQR": muestra.codigoQR,
        "tipoProceso": muestra.tipoProceso,
        "pesoKg": round(muestra.peso_lb * 0.453592, 2),
        "evidenciaFoto": "url_de_la_foto_aqui"
    })

    return {
        "mensaje": "Muestra registrada exitosamente",
        "muestra_id": muestra_db.id
    }