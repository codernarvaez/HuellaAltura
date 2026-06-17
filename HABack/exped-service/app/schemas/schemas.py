from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

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
    nombre: str = Field(..., example="pH del suelo")
    valor: str = Field(..., example="6.5")
    tipo_dato: TipoDatoEnum = Field(..., example="FLOAT")


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
    variables: list["VariableDinamicaCreate"] | None = None


class DatoAgroambientalOut(DatoAgroambientalBase):
    id: str
    expediente_id: str
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


# ─── Productor ───────────────────────────────────────────────

class ProductorCreate(BaseModel):
    nombre_completo: str = Field(..., example="José Miguel Mosquera")
    cedula_id: str = Field(..., example="1100433455")
    organizacion: str | None = Field(None, example="Asociación APECAEL")
    celular: str | None = None
    genero: GeneroEnum | None = None
    edad: int | None = None


class ProductorUpdate(BaseModel):
    nombre_completo: str | None = None
    organizacion: str | None = None
    celular: str | None = None
    genero: GeneroEnum | None = None
    edad: int | None = None


class ProductorOut(ProductorCreate):
    id: str
    creado_en: datetime
    actualizado_en: datetime

    class Config:
        from_attributes = True


# ─── Finca ───────────────────────────────────────────────────

class FincaCreate(BaseModel):
    nombre: str = Field(..., example="El Ahuacate")
    provincia: str | None = Field(None, example="Loja")
    canton: str | None = Field(None, example="Loja")
    parroquia: str | None = None
    area_total_ha: float | None = Field(None, example=3.0)
    area_cultivada_ha: float | None = None
    tenencia: TenenciaEnum | None = None
    latitud: float | None = Field(None, example=-4.2625)
    longitud: float | None = Field(None, example=-79.2231)
    productor_id: str


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
    area_total_ha: float | None = None
    area_cultivada_ha: float | None = None
    tenencia: TenenciaEnum | None = None
    latitud: float | None = None
    longitud: float | None = None


# ─── Expediente ──────────────────────────────────────────────

class ExpedienteCreate(BaseModel):
    productor_id: str
    finca_id: str
    organizacion_inquilino: str | None = None
    datos_agroambientales: DatoAgroambientalCreate | None = None


class ExpedienteUpdate(BaseModel):
    estado: EstadoEnum | None = None
    organizacion_inquilino: str | None = None


class ExpedienteOut(BaseModel):
    id: str
    estado: str
    organizacion_inquilino: str | None = None
    productor: ProductorOut
    finca: FincaOut
    creado_en: datetime
    actualizado_en: datetime
    datos_agroambientales: list[DatoAgroambientalOut] = []
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
