from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ─── Muestras en Finca ───────────────────────────────────────

class MuestraCreate(BaseModel):
    fincaId: int = Field(..., description="ID de la Finca georreferenciada")
    productorId: int = Field(..., description="ID del Productor asociado")
    codigoQR: str = Field(..., description="Código QR único de trazabilidad")
    tipoProceso: str = Field(..., description="Lavado, Honey o Natural")
    peso_lb: float = Field(..., description="Peso capturado en finca en libras (ej. 0.5 o 1.0)")

class MuestraOut(MuestraCreate):
    id: int
    pesoKg: float
    fechaToma: datetime

    class Config:
        from_attributes = True

# ─── Laboratorio: Análisis Físico ────────────────────────────

class AnalisisFisicoCreate(BaseModel):
    muestraId: int
    humedad: float = Field(..., ge=10.0, le=12.0, description="Humedad % (umbral estricto 10-12%)")
    criba: str = Field(..., description="Criba (14 al 18)")
    densidad: float = Field(..., description="Densidad en g/l")
    defectosPrim: int = Field(..., description="Defectos primarios sobre 350g")
    defectosSec: int = Field(..., description="Defectos secundarios sobre 350g")

class AnalisisFisicoOut(AnalisisFisicoCreate):
    id: int
    fechaAnalisis: datetime

    class Config:
        from_attributes = True

# ─── Laboratorio: Análisis Sensorial (SCA) ───────────────────

class AnalisisSensorialCreate(BaseModel):
    muestraId: int
    fraganciaAroma: float = Field(..., ge=0, le=10)
    sabor: float = Field(..., ge=0, le=10)
    saborResidual: float = Field(..., ge=0, le=10)
    acidez: float = Field(..., ge=0, le=10)
    cuerpo: float = Field(..., ge=0, le=10)
    uniformidad: float = Field(..., ge=0, le=10)
    balance: float = Field(..., ge=0, le=10)
    tazaLimpia: float = Field(..., ge=0, le=10)
    dulzor: float = Field(..., ge=0, le=10)
    puntajeCatador: float = Field(..., ge=0, le=10)
    nivelTueste: str = Field(..., description="Evaluación del nivel de tueste")

class AnalisisSensorialOut(AnalisisSensorialCreate):
    id: int
    puntajeTotal: float
    clasificacion: str = Field(..., description="Ej: Café de Especialidad")

    class Config:
        from_attributes = True

# ─── Gerencia: Orden de Compra ───────────────────────────────

class OrdenCompraCreate(BaseModel):
    muestraId: int
    precioAcordado: float
    volumenKg: float
    primas: Optional[float] = None

class OrdenCompraOut(OrdenCompraCreate):
    id: int
    aprobadoEUDR: bool
    estado: str

    class Config:
        from_attributes = True

# ─── Bodega: Inventario y Acopio ─────────────────────────────

class BodegaIngresoCreate(BaseModel):
    ordenCompraId: int
    codigoQR: str = Field(..., description="Lectura del código QR del productor")
    pesoIngresado_lb: float = Field(..., description="Peso ingresado en la báscula (libras)")
    tipoProceso: str = Field(..., description="Lavado, Honey o Natural para validación de saco")

class InventarioAcopioOut(BaseModel):
    id: int
    ordenCompraId: int
    pesoIngresoKg: float
    pesoSalidaKg: float
    estado: str

    class Config:
        from_attributes = True



# --- Procesamiento: Trilla ---

class TrillaCreate(BaseModel):
    inventarioId: int
    factorRendimiento: float = Field(
        ..., 
        ge=0.78, 
        le=0.82, 
        description="El factor dinámico debe mantenerse en el rango configurado de 0.78 a 0.82"
    )

class TrillaOut(BaseModel):
    id: int
    inventarioId: int
    factorRendimiento: float
    pesoEntradaKg: float
    pesoOroKg: float
    mermaKg: float
    
    class Config:
        from_attributes = True
        
# ─── Exportación y Despacho ──────────────────────────────────

class DespachoCreate(BaseModel):
    inventarioId: int
    peso_salida_kg: float = Field(..., gt=0, description="Peso exacto en KG a despachar")
    destino: str = Field(..., description="Puerto, cliente o destino final")