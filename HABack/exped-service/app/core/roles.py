"""EUDR role constants — must match auth-service/app/core/roles.py."""

SUPER_ADMIN = "SUPER_ADMIN"
TENANT_ADMIN = "TENANT_ADMIN"
TECNICO_CAMPO = "TECNICO_CAMPO"
AUDITOR_INTERNO = "AUDITOR_INTERNO"

EUDR_ROLES: tuple[str, ...] = (
    SUPER_ADMIN,
    TENANT_ADMIN,
    TECNICO_CAMPO,
    AUDITOR_INTERNO,
)
