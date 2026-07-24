"""Grupos de roles autorizados en el módulo de Acopio (Módulo 3).

Cada etapa de la cadena de custodia tiene su propio grupo para que la
separación de funciones sea real: quien toma la muestra no la cata, quien la
cata no autoriza la compra y quien autoriza la compra no la pesa en bodega.

`TECNICO_CAMPO` se mantiene en la toma de muestras porque es quien opera en
finca. Los administradores conservan acceso transversal para poder desatascar
la operación, y toda acción queda auditada vía `log_user_action`.
"""

from app.core.roles import (
    ANALISTA_FISICO,
    AUDITOR_INTERNO,
    BODEGUERO,
    CATADOR_Q,
    GERENCIA_ACOPIO,
    JEFE_CALIDAD,
    SUPER_ADMIN,
    TECNICO_CAMPO,
    TENANT_ADMIN,
)

_ADMINS: tuple[str, ...] = (SUPER_ADMIN, TENANT_ADMIN)

# Toma de muestras en finca (RF-APE-01, RF-APE-02)
MUESTREO: tuple[str, ...] = (*_ADMINS, TECNICO_CAMPO)

# Análisis físico de laboratorio: humedad, criba, densidad, defectos (RF-APE-03)
ANALISIS_FISICO: tuple[str, ...] = (*_ADMINS, ANALISTA_FISICO, JEFE_CALIDAD)

# Catación SCA (RF-APE-04, RF-APE-05)
CATACION: tuple[str, ...] = (*_ADMINS, CATADOR_Q, JEFE_CALIDAD)

# Decisión de compra y despacho: control comercial (RF-APE-06, RF-APE-07)
GERENCIA: tuple[str, ...] = (*_ADMINS, GERENCIA_ACOPIO)

# Operación de bodega y trilla (RF-APE-08)
BODEGA: tuple[str, ...] = (*_ADMINS, BODEGUERO)

# Consulta del certificado de trazabilidad, incluye auditoría
CONSULTA: tuple[str, ...] = (
    *_ADMINS,
    TECNICO_CAMPO,
    AUDITOR_INTERNO,
    JEFE_CALIDAD,
    GERENCIA_ACOPIO,
)
