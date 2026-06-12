from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core import endpoints
from app.database import db
from app.routers import expedientes, agroambiental, fincas, auditoria, certificados


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.connect()
    yield
    db.disconnect()


app = FastAPI(
    title="GeoGuard EUDR — Expedientes",
    description="API para Gestión de Expedientes, Trazabilidad e Información Agroambiental",
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expedientes.router, prefix=endpoints.EXPEDIENTES_PREFIX, tags=["Expedientes"])
app.include_router(agroambiental.router, prefix=endpoints.AGROAMBIENTAL_PREFIX, tags=["Agroambiental"])
app.include_router(fincas.router, prefix=endpoints.FINCAS_PREFIX, tags=["Fincas"])
app.include_router(auditoria.router, prefix=endpoints.AUDITORIA_PREFIX, tags=["Auditoría GEE"])
app.include_router(certificados.router, prefix=endpoints.CERTIFICADOS_PREFIX, tags=["Certificados DDS"])


@app.get(endpoints.ROOT)
def root():
    return {
        "message": "GeoGuard EUDR API — Expedientes",
        "version": settings.app_version,
        "auth": "Identidad centralizada vía auth-service",
    }


@app.get(endpoints.HEALTH_CHECK)
def health():
    return {"status": "ok", "service": settings.app_name}
