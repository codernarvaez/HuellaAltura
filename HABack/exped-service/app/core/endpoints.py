"""Centralized API endpoint paths for exped-service."""

API_V1_PREFIX = "/api/v1"

EXPEDIENTES_PREFIX = f"{API_V1_PREFIX}/expedientes"
AGROAMBIENTAL_PREFIX = f"{API_V1_PREFIX}/agroambiental"
PRODUCTORES_PREFIX = f"{API_V1_PREFIX}/productores"
FINCAS_PREFIX = f"{API_V1_PREFIX}/fincas"
AUDITORIA_PREFIX = f"{API_V1_PREFIX}/auditoria"
CERTIFICADOS_PREFIX = f"{API_V1_PREFIX}/certificados"
VARIABLES_PREFIX = f"{API_V1_PREFIX}/variables"
SYNC_PREFIX = f"{API_V1_PREFIX}/sync"

HEALTH_CHECK = "/health"
ROOT = "/"

# auth-service internal (S2S)
AUTH_INTERNAL_AUDIT = "/api/internal/audit"
AUTH_INTERNAL_SESSION_VALIDATE = "/api/internal/session/validate"
