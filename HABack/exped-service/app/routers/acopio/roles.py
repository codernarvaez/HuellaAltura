"""Grupos de roles autorizados en el módulo de Acopio (Módulo 3).

Mientras no existan los roles especializados del Módulo 3
(TECNICO_CALIDAD, ANALISTA_FISICO, CATADOR_Q, JEFE_CALIDAD, GERENCIA_ACOPIO,
BODEGUERO) en auth-service, se reutilizan los roles ya sembrados. Al crearlos,
basta con añadirlos a la tupla correspondiente.
"""

from app.core.roles import AUDITOR_INTERNO, SUPER_ADMIN, TECNICO_CAMPO, TENANT_ADMIN

# Toma de muestras y análisis de laboratorio (RF-APE-01, 03, 04)
CALIDAD: tuple[str, ...] = (SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO)

# Decisión de compra y despacho: control comercial (RF-APE-06, 07)
GERENCIA: tuple[str, ...] = (SUPER_ADMIN, TENANT_ADMIN)

# Operación de bodega y trilla (RF-APE-08)
BODEGA: tuple[str, ...] = (SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO)

# Consulta del certificado de trazabilidad, incluye auditoría
CONSULTA: tuple[str, ...] = (SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO)
