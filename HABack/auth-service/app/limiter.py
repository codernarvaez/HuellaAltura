from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def client_ip(request: Request) -> str:
    """IP real del cliente detrás de Render / proxies.

    HAFront hace login vía SSR: sin X-Forwarded-For, todas las peticiones
    comparten la IP saliente de Render y disparan el 429 global de slowapi.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip() or get_remote_address(request)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip and real_ip.strip():
        return real_ip.strip()
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip)
