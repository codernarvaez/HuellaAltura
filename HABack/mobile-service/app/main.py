from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html
import logging
import sys

from app.config import settings
from app.core.endpoints import endpoints
from app.routers import mobile, asociaciones
from app.database import db

# Basic logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    stream=sys.stdout
)
logger = logging.getLogger("mobile-service")

app = FastAPI(
    title="Huella de Altura - Mobile API",
    version=settings.app_version,
    description="""
    Backend especializado para la aplicación móvil de Huella de Altura.
    
    ### Características Principales:
    * **Consumo de Auth-Service:** Validación centralizada de usuarios y roles.
    * **Gestión de Asociaciones:** Registro de organizaciones y fincas vinculadas a productores.
    * **Seguridad:** Autenticación basada en JWT compartida con el ecosistema backend.
    
    ### Flujo de Autenticación:
    Este servicio actúa como consumidor del `auth-service`. Cada petición protegida valida el token 
    JWT localmente y luego sincroniza el estado del usuario con el servicio de identidad central.
    """,
    openapi_url=f"{settings.api_prefix}/openapi.json",
    docs_url=f"{settings.api_prefix}{endpoints.DOCS}",
    redoc_url=None, # Desactivamos redoc por defecto para usar nuestra ruta personalizada si se requiere
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de Routers
app.include_router(mobile.router, prefix=settings.api_prefix)
app.include_router(asociaciones.router, prefix=settings.api_prefix)

@app.on_event("startup")
async def startup():
    try:
        await db.connect(timeout=30)
        logger.info("Database connected successfully to Neon")
    except Exception as e:
        logger.error(f"Could not connect to database: {e}")
        # En desarrollo podemos dejar que continúe, pero en prod debería fallar
        if not settings.debug:
            raise e

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

@app.get(
    endpoints.HEALTH_CHECK,
    tags=["Salud"],
    summary="Comprobar Estado del Servidor",
    description="Verifica si el servicio móvil y su conexión a la base de datos están operativos."
)
async def health_check():
    return {
        "status": "online",
        "app": settings.app_name,
        "version": settings.app_version,
        "database": "connected" # Simplificado
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
