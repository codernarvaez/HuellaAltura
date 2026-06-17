import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional

from app.config import settings

security = HTTPBearer()

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. Decodificación local rápida
        payload = jwt.decode(
            token.credentials, 
            settings.secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        # 2. Consumo de auth-service para obtener perfil completo y validar sesión
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.auth_service_url}/api/auth/me",
                headers={"Authorization": f"Bearer {token.credentials}"}
            )
            
        if response.status_code != 200:
            raise credentials_exception
            
        user_data = response.json()
        return user_data
        
    except (JWTError, httpx.RequestError):
        raise credentials_exception

async def require_auth(user: dict = Depends(get_current_user)):
    """
    Verifica que el usuario esté autenticado. 
    Según los requerimientos, todos los roles en el sistema (seed.py) 
    tienen permiso para crear asociaciones.
    """
    return user
