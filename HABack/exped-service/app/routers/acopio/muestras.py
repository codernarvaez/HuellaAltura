from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from prisma import Prisma

from app.database import get_db
from app.dependencies import log_user_action, require_roles
from app.routers.acopio.roles import MUESTREO
from app.schemas.acopio import MuestraCreate

router = APIRouter(prefix="/acopio/muestras", tags=["Acopio - Muestras"])


@router.post(
    "/",
    dependencies=[Depends(log_user_action("registrar_muestra"))],
)
def registrar_muestra(
    muestra: MuestraCreate,
    db: Annotated[Prisma, Depends(get_db)],
    current_user: dict = Depends(require_roles(*MUESTREO)),
):
    """
    Registra la obtención de una muestra en finca (RF-APE-01).

    La muestra queda vinculada a la finca georreferenciada del productor, que es
    la que sustenta la validación EUDR posterior (RF-APE-02).
    """
    finca_db = db.finca.find_unique(where={"id": muestra.fincaId})
    if not finca_db:
        raise HTTPException(status_code=404, detail="Finca no encontrada")

    muestra_db = db.muestra.create(
        data={
            "fincaId": muestra.fincaId,
            "productorId": muestra.productorId,
            "codigoQR": muestra.codigoQR,
            "tipoProceso": muestra.tipoProceso,
            "pesoKg": round(muestra.peso_lb * 0.453592, 2),  # lb -> kg
            "evidenciaFoto": muestra.evidenciaFoto,
        }
    )

    return {
        "mensaje": "Muestra registrada exitosamente",
        "muestra_id": muestra_db.id,
    }
