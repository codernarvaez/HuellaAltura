import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.core import endpoints
from app.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.routers import process

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "%s v%s listo (env=%s, chain=%s, dry_run=%s)",
        settings.app_name,
        settings.app_version,
        settings.environment,
        settings.polygon_chain_id,
        settings.polygon_dry_run,
    )
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Notario digital Polygon; notificaciones vía sender-service.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.include_router(process.router, prefix=settings.api_prefix)


@app.get(endpoints.HEALTH, tags=["health"])
async def health():
    return {
        "ok": True,
        "service": settings.app_name,
        "version": settings.app_version,
        "polygon_chain_id": settings.polygon_chain_id,
        "dry_run": settings.polygon_dry_run,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
    )
