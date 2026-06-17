from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums (valores alineados con Prisma) ────────────────────

class TenenciaEnum(str, Enum):
    PROPIA = "PROPIA"
    POSESION = "POSESION"
    ARRENDAMIENTO = "ARRENDAMIENTO"


class GeneroEnum(str, Enum):
    MASCULINO = "MASCULINO"
    FEMENINO = "FEMENINO"


class EstadoEnum(str, Enum):
    PENDIENTE = "PENDIENTE"
    EN_PROCESO = "EN_PROCESO"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"


class RolNombreEnum(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    TENANT_ADMIN = "TENANT_ADMIN"
    TECNICO_CAMPO = "TECNICO_CAMPO"
    AUDITOR_INTERNO = "AUDITOR_INTERNO"


class ResultadoAuditoriaEnum(str, Enum):
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"


class EstadoCertificadoEnum(str, Enum):
    VIGENTE = "VIGENTE"
    VENCIDO = "VENCIDO"
    REVOCADO = "REVOCADO"


# ─── Variable Dinámica ───────────────────────────────────────

class TipoDatoEnum(str, Enum):
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
    nombre: Optional[str] = None
    valor: Optional[str] = None
    tipo_dato: Optional[TipoDatoEnum] = None


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
    indice_shannon: Optional[float] = None
    indice_simpson: Optional[float] = None
    uso_suelo: Optional[str] = None
    cobertura_forestal: Optional[str] = None
    sistema_produccion: Optional[str] = None
    biomasa_arboles: Optional[float] = None
    biomasa_cafe: Optional[float] = None
    hojarasca_mantillo: Optional[float] = None
    carbono_organico_suelo: Optional[float] = None
    total_stock_carbono: Optional[float] = None


class DatoAgroambientalCreate(DatoAgroambientalBase):
    variables: Optional[List["VariableDinamicaCreate"]] = None


class DatoAgroambientalOut(DatoAgroambientalBase):
    id: str
    expediente_id: str
    creado_en: datetime
    variables: List["VariableDinamicaOut"] = []

    class Config:
        from_attributes = True


# ─── Historial / Trazabilidad ────────────────────────────────

class HistorialCreate(BaseModel):
    accion: str
    descripcion: Optional[str] = None
    usuario: Optional[str] = None


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
    organizacion: Optional[str] = Field(None, example="Asociación APECAEL")
    celular: Optional[str] = None
    genero: Optional[GeneroEnum] = None
    edad: Optional[int] = None


class ProductorUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    organizacion: Optional[str] = None
    celular: Optional[str] = None
    genero: Optional[GeneroEnum] = None
    edad: Optional[int] = None


class ProductorOut(ProductorCreate):
    id: str
    creado_en: datetime
    actualizado_en: datetime

    class Config:
        from_attributes = True


# ─── Finca ───────────────────────────────────────────────────

class FincaCreate(BaseModel):
    nombre: str = Field(..., example="El Ahuacate")
    provincia: Optional[str] = Field(None, example="Loja")
    canton: Optional[str] = Field(None, example="Loja")
    parroquia: Optional[str] = None
    area_total_ha: Optional[float] = Field(None, example=3.0)
    area_cultivada_ha: Optional[float] = None
    tenencia: Optional[TenenciaEnum] = None
    latitud: Optional[float] = Field(None, example=-4.2625)
    longitud: Optional[float] = Field(None, example=-79.2231)
    productor_id: str


class FincaOut(FincaCreate):
    id: str
    eudr_id: Optional[str] = None
    creado_en: datetime

    class Config:
        from_attributes = True


class FincaUpdate(BaseModel):
    nombre: Optional[str] = None
    provincia: Optional[str] = None
    canton: Optional[str] = None
    parroquia: Optional[str] = None
    area_total_ha: Optional[float] = None
    area_cultivada_ha: Optional[float] = None
    tenencia: Optional[TenenciaEnum] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None


# ─── Expediente ──────────────────────────────────────────────

class ExpedienteCreate(BaseModel):
    productor_id: str
    finca_id: str
    organizacion_inquilino: Optional[str] = None
    datos_agroambientales: Optional[DatoAgroambientalCreate] = None


class ExpedienteUpdate(BaseModel):
    estado: Optional[EstadoEnum] = None
    organizacion_inquilino: Optional[str] = None


class ExpedienteOut(BaseModel):
    id: str
    estado: str
    organizacion_inquilino: Optional[str] = None
    productor: ProductorOut
    finca: FincaOut
    creado_en: datetime
    actualizado_en: datetime
    datos_agroambientales: List[DatoAgroambientalOut] = []
    historial: List[HistorialOut] = []

    class Config:
        from_attributes = True


# ─── AuditoriaGEE ────────────────────────────────────────────

class AuditoriaCreate(BaseModel):
    expediente_id: str
    resultado: ResultadoAuditoriaEnum
    deforestacion_detectada: bool = False
    fecha_corte: Optional[datetime] = None
    fuente: Optional[str] = "Google Earth Engine"
    observaciones: Optional[str] = None
    ejecutado_por: Optional[str] = None


class AuditoriaOut(BaseModel):
    id: str
    expediente_id: str
    fecha_auditoria: datetime
    resultado: str
    deforestacion_detectada: bool
    fecha_corte: Optional[datetime] = None
    fuente: Optional[str] = None
    observaciones: Optional[str] = None
    ejecutado_por: Optional[str] = None

    class Config:
        from_attributes = True


# ─── CertificadoDDS ──────────────────────────────────────────

class CertificadoCreate(BaseModel):
    expediente_id: str
    fecha_vencimiento: Optional[datetime] = None
    generado_por: Optional[str] = None
    url_documento: Optional[str] = None


class CertificadoOut(BaseModel):
    id: str
    expediente_id: str
    codigo_certificado: str
    fecha_emision: datetime
    fecha_vencimiento: Optional[datetime] = None
    estado: str
    generado_por: Optional[str] = None
    url_documento: Optional[str] = None

    class Config:
        from_attributes = True
