from fastapi import APIRouter, Depends
from app.dependencies import require_auth

router = APIRouter(prefix="/mobile", tags=["Mobile"])

@router.get("/profile")
async def get_profile(user: dict = Depends(require_auth)):
    """
    Ejemplo de endpoint protegido que consume datos de auth-service.
    """
    return {
        "message": "Perfil obtenido exitosamente desde el servicio móvil",
        "user_data": user
    }
