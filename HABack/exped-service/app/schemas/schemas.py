from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator

# ─── Enums (valores alineados con Prisma) ────────────────────

class TenenciaEnum(StrEnum):
    PROPIA = "PROPIA"
    POSESION = "POSESION"
    ARRENDAMIENTO = "ARRENDAMIENTO"


class GeneroEnum(StrEnum):
    MASCULINO = "MASCULINO"
    FEMENINO = "FEMENINO"


class EstadoEnum(StrEnum):
    PENDIENTE = "PENDIENTE"
    EN_PROCESO = "EN_PROCESO"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"


class RolNombreEnum(StrEnum):
    SUPER_ADMIN = "SUPER_ADMIN"
    TENANT_ADMIN = "TENANT_ADMIN"
    PRODUCTOR = "PRODUCTOR"
    TECNICO_CAMPO = "TECNICO_CAMPO"
    AUDITOR_INTERNO = "AUDITOR_INTERNO"


class ResultadoAuditoriaEnum(StrEnum):
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"


class EstadoCertificadoEnum(StrEnum):
    VIGENTE = "VIGENTE"
    VENCIDO = "VENCIDO"
    REVOCADO = "REVOCADO"


# ─── Variable Dinámica ───────────────────────────────────────

class TipoDatoEnum(StrEnum):
    STRING = "STRING"
    INTEGER = "INTEGER"
    FLOAT = "FLOAT"
    BOOLEAN = "BOOLEAN"
    DATE = "DATE"


class VariableDinamicaCreate(BaseModel):
    nombre: str | None = Field(None, example="pH del suelo")
    valor: str | None = Field(None, example="6.5")
    tipo_dato: TipoDatoEnum | None = Field(None, example="FLOAT")


class VariableDinamicaUpdate(BaseModel):
    nombre: str | None = None
    valor: str | None = None
    tipo_dato: TipoDatoEnum | None = None


class VariableDinamicaOut(BaseModel):
    id: int
    dato_id: str
    nombre: str
    valor: str
    tipo_dato: str

    class Config:
        from_attributes = True


# ─── Agroambiental ───────────────────────────────────────────

class DatoAgroambientalBase(BaseModel):
    indice_shannon: float | None = None
    indice_simpson: float | None = None
    uso_suelo: str | None = None
    cobertura_forestal: str | None = None
    sistema_produccion: str | None = None
    biomasa_arboles: float | None = None
    biomasa_cafe: float | None = None
    hojarasca_mantillo: float | None = None
    carbono_organico_suelo: float | None = None
    total_stock_carbono: float | None = None


class DatoAgroambientalCreate(DatoAgroambientalBase):
    finca_id: str = Field(..., description="ID de la finca asociada")
    variables: list["VariableDinamicaCreate"] | None = None


class DatoAgroambientalOut(DatoAgroambientalBase):
    id: str
    finca_id: str
    creado_en: datetime
    variables: list["VariableDinamicaOut"] = []

    class Config:
        from_attributes = True


# ─── Historial / Trazabilidad ────────────────────────────────

class HistorialCreate(BaseModel):
    accion: str
    descripcion: str | None = None
    usuario: str | None = None


class HistorialOut(HistorialCreate):
    id: str
    expediente_id: str
    fecha: datetime

    class Config:
        from_attributes = True


# ─── Usuario (gestionado por auth-service) ──────────────────

# Los productores/usuarios se crean y gestionan en auth-service
# No hay modelo local de Productor en exped-service


# ─── Finca ───────────────────────────────────────────────────

class FincaCreate(BaseModel):
    nombre: str = Field(..., example="El Ahuacate")
    usuario_id: str = Field(..., example="uuid-del-usuario", description="ID del usuario (productor) de auth-service")
    provincia: str | None = Field(None, example="Loja")
    canton: str | None = Field(None, example="Loja")
    parroquia: str | None = None
    sector: str | None = Field(None, example="18", description="Barrio/Sector de la finca")
    area_total_ha: float | None = Field(None, example=3.0)
    area_cultivada_ha: float | None = None
    tenencia: TenenciaEnum | None = None
    latitud: float | None = Field(None, example=-4.2625)
    longitud: float | None = Field(None, example=-79.2231)
    poligono: Any | None = Field(None, description="Datos del polígono de la finca (GeoJSON o lista de coordenadas)")

    @field_validator("poligono")
    @classmethod
    def validar_poligono(cls, v):
        if v is not None and isinstance(v, dict) and len(v) == 0:
            raise ValueError("El polígono no puede estar vacío. Proporciona coordenadas válidas.")
        return v


class FincaOut(FincaCreate):
    id: str
    eudr_id: str | None = None
    creado_en: datetime

    class Config:
        from_attributes = True


class FincaUpdate(BaseModel):
    nombre: str | None = None
    provincia: str | None = None
    canton: str | None = None
    parroquia: str | None = None
    sector: str | None = None
    area_total_ha: float | None = None
    area_cultivada_ha: float | None = None
    tenencia: TenenciaEnum | None = None
    latitud: float | None = None
    longitud: float | None = None
    poligono: Any | None = None

    @field_validator("poligono")
    @classmethod
    def validar_poligono(cls, v):
        if v is not None and isinstance(v, dict) and len(v) == 0:
            raise ValueError("El polígono no puede estar vacío. Proporciona coordenadas válidas.")
        return v


# ─── Expediente ──────────────────────────────────────────────

class ExpedienteCreate(BaseModel):
    dato_id: str = Field(..., description="ID del dato agroambiental asociado")
    organizacion_inquilino: str = Field(..., description="Organización/Inquilino (multi-tenant)")


class ExpedienteUpdate(BaseModel):
    estado: EstadoEnum | None = None
    organizacion_inquilino: str | None = None


class ExpedienteOut(BaseModel):
    id: str
    dato_id: str
    estado: str
    organizacion_inquilino: str | None = None
    creado_en: datetime
    actualizado_en: datetime
    historial: list[HistorialOut] = []

    class Config:
        from_attributes = True


# ─── AuditoriaGEE ────────────────────────────────────────────

class AuditoriaCreate(BaseModel):
    expediente_id: str
    resultado: ResultadoAuditoriaEnum
    deforestacion_detectada: bool = False
    fecha_corte: datetime | None = None
    fuente: str | None = "Google Earth Engine"
    observaciones: str | None = None
    ejecutado_por: str | None = None


class AuditoriaOut(BaseModel):
    id: str
    expediente_id: str
    fecha_auditoria: datetime
    resultado: str
    deforestacion_detectada: bool
    fecha_corte: datetime | None = None
    fuente: str | None = None
    observaciones: str | None = None
    ejecutado_por: str | None = None

    class Config:
        from_attributes = True


# ─── CertificadoDDS ──────────────────────────────────────────

class CertificadoCreate(BaseModel):
    expediente_id: str
    fecha_vencimiento: datetime | None = None
    generado_por: str | None = None
    url_documento: str | None = None


class CertificadoOut(BaseModel):
    id: str
    expediente_id: str
    codigo_certificado: str
    fecha_emision: datetime
    fecha_vencimiento: datetime | None = None
    estado: str
    generado_por: str | None = None
    url_documento: str | None = None

    class Config:
        from_attributes = True


# --- SCHEMAS PARA AGENDAR LABOR (Planificación) ---

class LaborAgricolaBase(BaseModel):
    nombre: str
    tipo_proceso: str
    mes: str
    cantidad_proyectada: str

class LaborAgricolaCreate(LaborAgricolaBase):
    finca_id: str

class LaborAgricolaOut(LaborAgricolaBase):
    id: str
    finca_id: str
    estado: str
    creado_en: datetime

    class Config:
        from_attributes = True

# --- SCHEMAS PARA EJECUTAR LABOR ---

class InsumoLaborCreate(BaseModel):
    nombre: str
    cantidad: float
    unidad: str

class EjecucionLaborCreate(BaseModel):
    persona_desarrollo: str
    nombre_jornalero: str | None = None
    detalle_aplicacion: str
    salario: float | None = None
    insumos: list[InsumoLaborCreate]
    herramientas: list[str] # Lista de nombres
    
    # Evidencia
    foto_url: str | None = None
    foto_hash: str | None = None
    latitud: float | None = None
    longitud: float | None = None

class EjecucionLaborOut(BaseModel):
    id: str
    labor_id: str
    finca_id: str
    persona_desarrollo: str
    detalle_aplicacion: str
    estado: str = "REGISTRADO"
    timestamp: datetime
    
    class Config:
        from_attributes = True