# Modelos gestionados por Prisma — ver schema.prisma en la raíz del proyecto.
# Enums de dominio para schemas y routers.

import enum


class TenenciaEnum(enum.StrEnum):
    PROPIA = "PROPIA"
    POSESION = "POSESION"
    ARRENDAMIENTO = "ARRENDAMIENTO"


class GeneroEnum(enum.StrEnum):
    MASCULINO = "MASCULINO"
    FEMENINO = "FEMENINO"


class EstadoExpedienteEnum(enum.StrEnum):
    PENDIENTE = "PENDIENTE"
    EN_PROCESO = "EN_PROCESO"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"


class RolNombreEnum(enum.StrEnum):
    SUPER_ADMIN = "SUPER_ADMIN"
    TENANT_ADMIN = "TENANT_ADMIN"
    TECNICO_CAMPO = "TECNICO_CAMPO"
    AUDITOR_INTERNO = "AUDITOR_INTERNO"


class ResultadoAuditoriaEnum(enum.StrEnum):
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"


class EstadoCertificadoEnum(enum.StrEnum):
    VIGENTE = "VIGENTE"
    VENCIDO = "VENCIDO"
    REVOCADO = "REVOCADO"
