"""Centralized API endpoint paths."""

API_V1_PREFIX = "/api/v1"

EXPEDIENTES_PREFIX = f"{API_V1_PREFIX}/expedientes"
AGROAMBIENTAL_PREFIX = f"{API_V1_PREFIX}/agroambiental"
FINCAS_PREFIX = f"{API_V1_PREFIX}/fincas"
AUDITORIA_PREFIX = f"{API_V1_PREFIX}/auditoria"
CERTIFICADOS_PREFIX = f"{API_V1_PREFIX}/certificados"
VARIABLES_PREFIX = f"{API_V1_PREFIX}/variables"

HEALTH_CHECK = "/health"
ROOT = "/"

# auth-service internal (S2S)
AUTH_INTERNAL_AUDIT = "/api/internal/audit"
AUTH_INTERNAL_SESSION_VALIDATE = "/api/internal/session/validate"
