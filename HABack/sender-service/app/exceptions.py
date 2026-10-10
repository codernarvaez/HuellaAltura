from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        body = {"ok": False, **detail}
    else:
        body = {"ok": False, "error": "http_error", "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content=body)


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "ok": False,
            "error": "validation_error",
            "message": "Payload inválido",
            "details": exc.errors(),
        },
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": "internal_error",
            "message": "Error interno al procesar el correo",
        },
    )
