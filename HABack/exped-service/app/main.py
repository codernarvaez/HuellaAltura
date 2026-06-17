from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core import endpoints
from app.database import db
from app.routers import (
    agroambiental,
    auditoria,
    certificados,
    expedientes,
    fincas,
    productores,
    variables,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.connect()
    yield
    db.disconnect()


app = FastAPI(
    title="GeoGuard EUDR — Expedientes",
    description="""
## API para Gestión de Expedientes, Trazabilidad e Información Agroambiental

Esta API es el núcleo del sistema **GeoGuard EUDR**, encargada de gestionar el ciclo de vida completo de los expedientes de productores, su información agroambiental y los procesos de certificación para el cumplimiento de la normativa EUDR (European Union Deforestation Regulation).

### Flujo de Entidades y Relaciones:
1.  **Expediente**: Es la entidad principal que consolida la información del productor y la finca.
    *   Genera un identificador único global (`eudr_id`) para trazabilidad internacional.
2.  **Datos Agroambientales**: Cada expediente puede tener múltiples registros técnicos sobre biodiversidad, uso de suelo y stock de carbono.
3.  **Variables Dinámicas**: Permiten extender la información técnica de los datos agroambientales sin modificar el esquema fijo. Relación: `Dato -> Variable`.
4.  **Auditoría GEE (Google Earth Engine)**: Proceso de validación satelital. Es un requisito previo para la certificación.
5.  **Certificado DDS (Due Diligence Statement)**: Documento final de cumplimiento generado tras una auditoría exitosa.

### Seguridad:
*   La autenticación es gestionada de forma centralizada por el `auth-service`.
*   Se requiere un token JWT válido para todas las operaciones.
*   El acceso a endpoints de escritura está restringido por roles (`SUPER_ADMIN`, `TENANT_ADMIN`, `TECNICO_CAMPO`, `AUDITOR_INTERNO`).
""",
    version=settings.app_version,
    contact={
        "name": "GeoGuard Support",
        "email": "support@geoguard.com",
    },
    license_info={
        "name": "Proprietary",
    },
    lifespan=lifespan,
    docs_url=None,
    redoc_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    expedientes.router,
    prefix=endpoints.EXPEDIENTES_PREFIX,
    tags=["Expedientes"],
)
app.include_router(
    agroambiental.router,
    prefix=endpoints.AGROAMBIENTAL_PREFIX,
    tags=["Agroambiental"],
)
app.include_router(
    productores.router,
    prefix=endpoints.PRODUCTORES_PREFIX,
    tags=["Productores"],
)
app.include_router(fincas.router, prefix=endpoints.FINCAS_PREFIX, tags=["Fincas"])
app.include_router(
    auditoria.router,
    prefix=endpoints.AUDITORIA_PREFIX,
    tags=["Auditoría GEE"],
)
app.include_router(
    certificados.router,
    prefix=endpoints.CERTIFICADOS_PREFIX,
    tags=["Certificados DDS"],
)
app.include_router(
    variables.router,
    prefix=endpoints.VARIABLES_PREFIX,
    tags=["Variables Dinámicas"],
)


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
