from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma

from app.database import get_db
from app.dependencies import require_auth
from app.schemas.asociacion import AsociacionCreate, AsociacionOut

router = APIRouter(prefix="/asociaciones", tags=["Asociaciones"])

@router.post(
    "/", 
    response_model=AsociacionOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Nueva Asociación",
    description="""
    Permite a un usuario autenticado (Productor o cualquier rol autorizado) registrar una nueva organización.
    
    **Funcionamiento:**
    1. El sistema valida el token JWT contra el `auth-service`.
    2. Se extrae el nombre completo del usuario (`first_name` + `last_name`).
    3. Se crea el vínculo entre el usuario y la nueva asociación en la base de datos de Neon.
    4. Se registra la finca asociada a la organización.
    """
)
async def create_asociacion(
    data: AsociacionCreate,
    user: dict = Depends(require_auth),
    db: Prisma = Depends(get_db)
):
    try:
        # Extraer nombre del creador
        first_name = user.get("first_name", "")
        last_name = user.get("last_name", "")
        creador_nombre = f"{first_name} {last_name}".strip() or "Usuario Desconocido"
        
        # Crear asociación en DB
        new_asoc = await db.asociacion.create(
            data={
                "nombre": data.nombre,
                "nombre_finca": data.nombre_finca,
                "creado_por": creador_nombre,
                "user_id": user.get("id"),
            }
        )
        return new_asoc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al registrar la asociación: {str(e)}"
        )

@router.get(
    "/", 
    response_model=List[AsociacionOut],
    summary="Listar Mis Asociaciones",
    description="Recupera todas las asociaciones vinculadas al usuario autenticado."
)
async def list_asociaciones(
    user: dict = Depends(require_auth),
    db: Prisma = Depends(get_db)
):
    return await db.asociacion.find_many(
        where={"user_id": user.get("id")}
    )
