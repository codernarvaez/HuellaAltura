"""EUDR role constants — single source of truth for RBAC."""

SUPER_ADMIN = "SUPER_ADMIN"
TENANT_ADMIN = "TENANT_ADMIN"
TECNICO_CAMPO = "TECNICO_CAMPO"
AUDITOR_INTERNO = "AUDITOR_INTERNO"
PRODUCTOR = "PRODUCTOR"

# Roles operativos del Módulo 3 (Acopio, Procesamiento y Exportación).
# Separan la cadena de custodia: quien toma la muestra no la cata, quien la
# cata no decide la compra y quien decide la compra no la pesa en bodega.
ANALISTA_FISICO = "ANALISTA_FISICO"
CATADOR_Q = "CATADOR_Q"
JEFE_CALIDAD = "JEFE_CALIDAD"
GERENCIA_ACOPIO = "GERENCIA_ACOPIO"
BODEGUERO = "BODEGUERO"

EUDR_ROLES: tuple[str, ...] = (
    SUPER_ADMIN,
    TENANT_ADMIN,
    TECNICO_CAMPO,
    AUDITOR_INTERNO,
    PRODUCTOR,
    ANALISTA_FISICO,
    CATADOR_Q,
    JEFE_CALIDAD,
    GERENCIA_ACOPIO,
    BODEGUERO,
)

DEFAULT_ROLE = PRODUCTOR
