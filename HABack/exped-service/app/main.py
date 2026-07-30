import os
from contextlib import asynccontextmanager
import json

# Forzar compatibilidad de Prisma en entornos de producción (Render)
os.environ["PRISMA_PY_DEBUG_GENERATOR"] = "1"

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.core import endpoints
from app.database import db
from app.routers import (
    agroambiental,
    auditoria,
    certificados,
    expedientes,
    documentos,
    fincas,
    formularios,
    productores,
    screening,
    variables,
    sync,
    geoespacial,
    labores,
)

from app.routers.acopio import (
    bodega,
    compras,
    despachos,
    laboratorio,
    muestras,
    trilla,
)


class ErrorMessageMiddleware(BaseHTTPMiddleware):
    """Sustituye los mensajes genéricos de FastAPI por otros más accionables.

    El cuerpo de la respuesta solo puede leerse una vez, así que cuando se
    consume hay que reconstruir la respuesta con el contenido ya leído. De lo
    contrario el cliente recibe un cuerpo vacío.
    """

    # detail genérico -> mensaje que devolvemos en su lugar
    _MENSAJES = {
        404: (
            "Not Found",
            lambda request: f"La ruta solicitada no existe: {request.method} {request.url.path}",
        ),
        403: (
            "Not authenticated",
            lambda _: (
                "Requiere autenticación. Proporciona un token JWT válido en el "
                "header 'Authorization: Bearer <token>'."
            ),
        ),
    }

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        regla = self._MENSAJES.get(response.status_code)
        if regla is None or not hasattr(response, "body_iterator"):
            return response

        detalle_generico, construir_mensaje = regla

        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        try:
            data = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            data = None

        if isinstance(data, dict) and data.get("detail") == detalle_generico:
            return JSONResponse(
                status_code=response.status_code,
                content={"detail": construir_mensaje(request)},
            )

        # No aplica la mejora: se devuelve el cuerpo original intacto
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
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
        "email": "jaimedavidmendoza1506@gmail.com",
    },
    license_info={
        "name": "Proprietary",
    },
    lifespan=lifespan,
    docs_url="/swagger",
    redoc_url="/docs",
)

app.add_middleware(ErrorMessageMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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
    formularios.router,
    prefix=endpoints.FORMULARIOS_PREFIX,
    tags=["Formularios Dinámicos"],
)
app.include_router(
    documentos.router,
    prefix=endpoints.DOCUMENTOS_PREFIX,
    tags=["Expediente Documental"],
)
app.include_router(
    screening.router,
    prefix=endpoints.CUMPLIMIENTO_PREFIX,
    tags=["Sanciones y Firma Digital"],
)
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
app.include_router(
    sync.router,
    prefix=endpoints.SYNC_PREFIX,
    tags=["Sincronización Offline"],
)
app.include_router(
    geoespacial.router,
    prefix="/api/v1/geoespacial",
    tags=["Carga Geoespacial & EUDR"],
)
app.include_router(labores.router)

# Módulo 3 — Acopio, Procesamiento y Exportación
app.include_router(muestras.router)
app.include_router(laboratorio.router)
app.include_router(compras.router)
app.include_router(bodega.router)
app.include_router(bodega.public_router)
app.include_router(trilla.router)
app.include_router(despachos.router)


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

