from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

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


# ─── Tipos de persona (RF-01) ────────────────────────────────

class TipoPersonaEnum(StrEnum):
    NATURAL = "NATURAL"
    JURIDICA = "JURIDICA"


class EstadoProductorEnum(StrEnum):
    BORRADOR = "BORRADOR"
    COMPLETO = "COMPLETO"
    BLOQUEADO = "BLOQUEADO"


# ─── Formularios dinámicos (RF-08, RF-09) ────────────────────

class EntidadFormularioEnum(StrEnum):
    PRODUCTOR = "PRODUCTOR"
    FINCA = "FINCA"
    AGROAMBIENTAL = "AGROAMBIENTAL"


class TipoCampoEnum(StrEnum):
    STRING = "STRING"
    INTEGER = "INTEGER"
    FLOAT = "FLOAT"
    BOOLEAN = "BOOLEAN"
    DATE = "DATE"
    SELECCION = "SELECCION"


class CampoFormularioBase(BaseModel):
    etiqueta: str = Field(..., example="Biomasa aérea")
    tipo_dato: TipoCampoEnum = Field(..., example="FLOAT")
    requerido: bool = False
    orden: int = 0
    seccion: str | None = Field(None, example="Carbono")
    ayuda: str | None = None
    opciones: list[str] | None = Field(None, description="Valores válidos si tipo_dato = SELECCION")
    visible_si_tipo_persona: TipoPersonaEnum | None = Field(
        None, description="Muestra el campo solo para este tipo de persona (RF-02)"
    )

    @model_validator(mode="after")
    def validar_opciones(self):
        if self.tipo_dato == TipoCampoEnum.SELECCION and not self.opciones:
            raise ValueError("Un campo de tipo SELECCION requiere al menos una opción.")
        return self


class CampoFormularioCreate(CampoFormularioBase):
    organizacion_inquilino: str
    entidad: EntidadFormularioEnum
    clave: str = Field(..., example="biomasa_aerea", description="Identificador estable del campo")

    @field_validator("clave")
    @classmethod
    def validar_clave(cls, v: str) -> str:
        if not v.replace("_", "").isalnum():
            raise ValueError("La clave solo admite letras, números y guion bajo.")
        return v.lower()


class CampoFormularioUpdate(BaseModel):
    etiqueta: str | None = None
    tipo_dato: TipoCampoEnum | None = None
    requerido: bool | None = None
    orden: int | None = None
    activo: bool | None = None
    seccion: str | None = None
    ayuda: str | None = None
    opciones: list[str] | None = None
    visible_si_tipo_persona: TipoPersonaEnum | None = None


class CampoFormularioOut(CampoFormularioBase):
    id: str
    organizacion_inquilino: str
    entidad: str
    clave: str
    activo: bool
    creado_en: datetime

    class Config:
        from_attributes = True


class ValorCampoIn(BaseModel):
    clave: str = Field(..., description="Clave del campo definido para la entidad")
    valor: str | None = None


class ValorCampoOut(BaseModel):
    clave: str
    etiqueta: str
    tipo_dato: str
    valor: str | None = None

    class Config:
        from_attributes = True


# ─── Documentos del expediente (RF-07, RF-08, RF-09) ─────────

class EstadoDocumentoEnum(StrEnum):
    PENDIENTE = "PENDIENTE"
    VALIDADO = "VALIDADO"
    RECHAZADO = "RECHAZADO"


class DocumentoCreate(BaseModel):
    organizacion_inquilino: str
    tipo_documento: str = Field(..., example="CEDULA_IDENTIDAD")
    url_storage: str = Field(..., description="Ubicación del archivo en el storage")
    productor_id: str | None = None
    finca_id: str | None = None
    nombre_archivo: str | None = None
    hash_sha256: str | None = Field(None, description="SHA-256 calculado en el dispositivo")
    mime: str | None = None
    tamano_bytes: int | None = None
    ocr_json: Any | None = None

    @model_validator(mode="after")
    def validar_titular(self):
        if not self.productor_id and not self.finca_id:
            raise ValueError("El documento debe asociarse a un productor o a una finca.")
        return self


class DocumentoUpdate(BaseModel):
    estado_validacion: EstadoDocumentoEnum | None = None
    observaciones: str | None = None
    ocr_json: Any | None = None


class DocumentoOut(BaseModel):
    id: str
    organizacion_inquilino: str
    productor_id: str | None = None
    finca_id: str | None = None
    tipo_documento: str
    nombre_archivo: str | None = None
    url_storage: str
    hash_sha256: str | None = None
    mime: str | None = None
    tamano_bytes: int | None = None
    subido_por: str | None = None
    estado_validacion: str
    observaciones: str | None = None
    creado_en: datetime

    class Config:
        from_attributes = True


class RequisitoDocumentalCreate(BaseModel):
    organizacion_inquilino: str
    tipo_persona: TipoPersonaEnum
    tipo_documento: str = Field(..., example="ESCRITURA_PREDIO")
    etiqueta: str = Field(..., example="Escritura del predio")
    obligatorio: bool = True
    orden: int = 0
    descripcion: str | None = None


class RequisitoDocumentalUpdate(BaseModel):
    etiqueta: str | None = None
    obligatorio: bool | None = None
    activo: bool | None = None
    orden: int | None = None
    descripcion: str | None = None


class RequisitoDocumentalOut(BaseModel):
    id: str
    organizacion_inquilino: str
    tipo_persona: str
    tipo_documento: str
    etiqueta: str
    obligatorio: bool
    activo: bool
    orden: int
    descripcion: str | None = None

    class Config:
        from_attributes = True


# ─── Firma digital del productor (RF-11) ─────────────────────

class FirmaProductorCreate(BaseModel):
    documento_id: str | None = Field(
        None, description="Documento tipo FIRMA con el trazo capturado"
    )
    latitud: float | None = None
    longitud: float | None = None
    firmado_en: datetime = Field(..., description="Instante de la firma en UTC")


class FirmaProductorOut(BaseModel):
    id: str
    productor_id: str
    documento_id: str | None = None
    hash_expediente: str
    latitud: float | None = None
    longitud: float | None = None
    firmado_en: datetime
    registrado_por: str | None = None
    creado_en: datetime

    class Config:
        from_attributes = True


# ─── Listas de sanciones (RF-14, RF-15, RF-16) ───────────────

class FuenteSancionEnum(StrEnum):
    OFAC_SDN = "OFAC_SDN"
    ONU_CONSOLIDATED = "ONU_CONSOLIDATED"


class ListaSancionCreate(BaseModel):
    fuente: FuenteSancionEnum
    referencia: str = Field(..., description="Identificador en la lista de origen")
    nombre: str
    tipo: str | None = Field(None, description="INDIVIDUO | ENTIDAD")
    programa: str | None = None
    nacionalidad: str | None = None


class ScreeningRequest(BaseModel):
    umbral: float = Field(
        85.0, ge=50.0, le=100.0, description="Puntaje mínimo para considerar coincidencia"
    )


class ScreeningOut(BaseModel):
    id: str
    productor_id: str
    nombre_consultado: str
    resultado: str
    puntaje_maximo: float
    umbral: float
    fuentes: str | None = None
    ejecutado_por: str | None = None
    creado_en: datetime

    class Config:
        from_attributes = True


class DesbloqueoRequest(BaseModel):
    motivo: str = Field(
        ..., min_length=10, description="Justificación documentada del desbloqueo"
    )


# ─── Productor ───────────────────────────────────────────────

# Campos exigidos por tipo de persona (RF-01, RF-02, RF-03).
_REQUERIDOS_NATURAL = ("nombres", "apellidos", "cedula")
_REQUERIDOS_JURIDICA = (
    "razon_social",
    "ruc",
    "representante_nombres",
    "representante_apellidos",
    "representante_cedula",
)


class ProductorBase(BaseModel):
    # Persona natural
    nombres: str | None = Field(None, example="María")
    apellidos: str | None = Field(None, example="Quizhpe")
    cedula: str | None = Field(None, example="1104567890")
    fecha_nacimiento: datetime | None = None
    genero: GeneroEnum | None = None
    nivel_educativo: str | None = None

    # Persona jurídica
    razon_social: str | None = Field(None, example="Asociación Cafetalera APECAEL")
    ruc: str | None = Field(None, example="1191234567001")
    representante_nombres: str | None = None
    representante_apellidos: str | None = None
    representante_cedula: str | None = None

    # Contacto
    email: str | None = None
    telefono: str | None = None
    direccion: str | None = None
    provincia: str | None = Field(None, example="Loja")
    canton: str | None = None
    parroquia: str | None = None


class ProductorCreate(ProductorBase):
    tipo_persona: TipoPersonaEnum = Field(..., description="NATURAL o JURIDICA")
    organizacion_inquilino: str = Field(..., description="Organización/Inquilino (multi-tenant)")
    usuario_id: str | None = Field(None, description="Cuenta en auth-service, si la tiene")

    @model_validator(mode="after")
    def validar_campos_por_tipo(self):
        """Exige los campos que correspondan al tipo de persona seleccionado."""
        requeridos = (
            _REQUERIDOS_NATURAL
            if self.tipo_persona == TipoPersonaEnum.NATURAL
            else _REQUERIDOS_JURIDICA
        )
        faltantes = [c for c in requeridos if not getattr(self, c, None)]
        if faltantes:
            raise ValueError(
                f"Para una persona {self.tipo_persona.value.lower()} son obligatorios: "
                f"{', '.join(faltantes)}."
            )
        return self


class ProductorUpdate(ProductorBase):
    estado: EstadoProductorEnum | None = None
    usuario_id: str | None = None


class ProductorOut(ProductorBase):
    id: str
    tipo_persona: str
    organizacion_inquilino: str
    usuario_id: str | None = None
    estado: str
    creado_en: datetime
    actualizado_en: datetime

    class Config:
        from_attributes = True


# ─── Finca ───────────────────────────────────────────────────

class FincaCreate(BaseModel):
    nombre: str = Field(..., example="El Ahuacate")
    usuario_id: str = Field(..., example="uuid-del-usuario", description="ID del usuario (productor) de auth-service")
    productor_id: str | None = Field(None, description="ID del Productor titular (RF-04)")
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
    
    # --- Nuevos campos agregados ---
    variedad_cafe: str | None = None
    densidad_siembra: str | None = None
    origen_semilla: str | None = None
    anio_establecimiento: int | None = None

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
    productor_id: str | None = None
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
    
    # --- Nuevos campos agregados ---
    variedad_cafe: str | None = None
    densidad_siembra: str | None = None
    origen_semilla: str | None = None
    anio_establecimiento: int | None = None

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
    watermark_text: str | None = None

class EjecucionLaborOut(BaseModel):
    id: str
    labor_id: str
    finca_id: str
    persona_desarrollo: str
    nombre_jornalero: str | None = None
    detalle_aplicacion: str
    salario: float | None = None
    foto_url: str | None = None
    foto_hash: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    estado: str = "REGISTRADO"
    timestamp: datetime
    
    class Config:
        from_attributes = True