from enum import StrEnum
from typing import ClassVar, Optional
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

# Conversión oficial libra -> kilogramo usada en todo el módulo.
LB_A_KG = 0.453592

# ─── Muestras en Finca ───────────────────────────────────────


class TipoProceso(StrEnum):
    """Procesos de beneficio admitidos (RF-APE-01)."""

    LAVADO = "Lavado"
    HONEY = "Honey"
    NATURAL = "Natural"


# Peso de muestra exigido por proceso, en kilogramos (RF-APE-01).
PESO_MUESTRA_KG = {
    TipoProceso.LAVADO: 0.5,
    TipoProceso.HONEY: 0.5,
    TipoProceso.NATURAL: 1.0,
}

# La báscula de campo tiene resolución limitada; se admite ±10 % sobre el
# peso nominal para no rechazar tomas legítimas por redondeo.
TOLERANCIA_PESO = 0.10


class MuestraCreate(BaseModel):
    # Finca.id y usuario_id son UUID (String) en schema.prisma, no enteros.
    fincaId: str = Field(..., description="ID de la Finca georreferenciada")
    productorId: str = Field(..., description="ID del Productor asociado")
    codigoQR: str = Field(..., description="Código QR único de trazabilidad")
    tipoProceso: TipoProceso = Field(..., description="Lavado, Honey o Natural")
    peso_lb: float = Field(
        ..., gt=0, description="Peso capturado en finca en libras (ej. 1.10 o 2.20)"
    )
    evidenciaFoto: Optional[str] = Field(
        None, description="URL de la evidencia fotográfica de la toma de muestra"
    )

    @model_validator(mode="after")
    def validar_peso_por_proceso(self) -> "MuestraCreate":
        """RF-APE-01: 0,5 kg para Lavado y Honey; 1 kg para Natural.

        Se valida sobre el peso convertido y no sobre las libras porque el
        requisito está expresado en kilogramos.
        """
        esperado = PESO_MUESTRA_KG[self.tipoProceso]
        peso_kg = self.peso_lb * LB_A_KG

        if abs(peso_kg - esperado) > esperado * TOLERANCIA_PESO:
            raise ValueError(
                f"El proceso {self.tipoProceso} exige una muestra de {esperado} kg "
                f"(±{int(TOLERANCIA_PESO * 100)} %). Se recibieron {peso_kg:.3f} kg "
                f"({self.peso_lb} lb)."
            )
        return self


class MuestraOut(MuestraCreate):
    id: str
    pesoKg: float
    fechaToma: datetime

    class Config:
        from_attributes = True

# ─── Laboratorio: Análisis Físico ────────────────────────────

# Umbrales de conformidad del análisis físico (RF-APE-03). Superarlos no
# impide registrar el análisis: marca el lote como no conforme.
HUMEDAD_MINIMA = 10.0
HUMEDAD_MAXIMA = 12.0
CRIBAS_ADMITIDAS = {"14", "15", "16", "17", "18"}


class AnalisisFisicoCreate(BaseModel):
    muestraId: str
    humedad: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description=(
            f"Humedad %. El umbral de conformidad es {HUMEDAD_MINIMA}-{HUMEDAD_MAXIMA} %; "
            "fuera de él el análisis se registra igualmente como NO CONFORME."
        ),
    )
    criba: str = Field(..., description="Criba (14 al 18)")
    densidad: float = Field(..., gt=0, description="Densidad en g/l")
    defectosPrim: int = Field(..., ge=0, description="Defectos primarios sobre 350g")
    defectosSec: int = Field(..., ge=0, description="Defectos secundarios sobre 350g")

    def evaluar_conformidad(self) -> list[str]:
        """Devuelve las no conformidades detectadas; lista vacía si es conforme."""
        hallazgos: list[str] = []

        if not HUMEDAD_MINIMA <= self.humedad <= HUMEDAD_MAXIMA:
            hallazgos.append(
                f"Humedad {self.humedad} % fuera del umbral "
                f"{HUMEDAD_MINIMA}-{HUMEDAD_MAXIMA} %"
            )

        if self.criba.strip() not in CRIBAS_ADMITIDAS:
            hallazgos.append(f"Criba {self.criba} fuera del rango admitido 14-18")

        # Un defecto primario descalifica el lote como especialidad (protocolo SCA).
        if self.defectosPrim > 0:
            hallazgos.append(
                f"{self.defectosPrim} defecto(s) primario(s) sobre 350 g: "
                "el lote no califica como especialidad"
            )

        return hallazgos


class AnalisisFisicoOut(AnalisisFisicoCreate):
    id: str
    conforme: bool
    noConformidades: list[str]
    fechaAnalisis: datetime

    class Config:
        from_attributes = True

# ─── Laboratorio: Análisis Sensorial (SCA) ───────────────────

class AnalisisSensorialCreate(BaseModel):
    """Formato de catación SCA: 10 atributos positivos, defectos y tueste.

    El puntaje final es la suma de los 10 atributos menos la penalización por
    defectos de taza (RF-APE-04). Sin esa resta ningún café podría bajar de
    puntaje por taint o fault, que es justamente lo que separa un lote de
    especialidad de uno comercial.
    """

    muestraId: str
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
    defectos: float = Field(
        0.0,
        ge=0,
        le=100,
        description=(
            "Penalización por defectos de taza (11º ítem SCA). Se calcula como "
            "nº de tazas afectadas × intensidad (taint = 2, fault = 4) y se "
            "resta del puntaje."
        ),
    )
    nivelTueste: str = Field(..., description="Evaluación del nivel de tueste")

    # Los 10 atributos positivos del formato, en el orden de la ficha SCA.
    ATRIBUTOS: ClassVar[tuple[str, ...]] = (
        "fraganciaAroma",
        "sabor",
        "saborResidual",
        "acidez",
        "cuerpo",
        "uniformidad",
        "balance",
        "tazaLimpia",
        "dulzor",
        "puntajeCatador",
    )

    def puntaje_final(self) -> float:
        """Σ(10 atributos) − defectos, acotado a [0, 100]."""
        bruto = sum(getattr(self, atributo) for atributo in self.ATRIBUTOS)
        return round(max(0.0, bruto - self.defectos), 2)


class AnalisisSensorialOut(AnalisisSensorialCreate):
    id: str
    puntajeTotal: float
    clasificacion: str = Field(..., description="Ej: Café de Especialidad")

    class Config:
        from_attributes = True

# ─── Gerencia: Orden de Compra ───────────────────────────────

class OrdenCompraCreate(BaseModel):
    muestraId: str
    precioAcordado: float = Field(..., gt=0, description="Precio acordado por quintal/kg")
    volumenKg: float = Field(..., gt=0, description="Volumen negociado en kilogramos")
    primas: Optional[float] = Field(
        None, ge=0, description="Primas por calidad o certificación"
    )

class OrdenCompraOut(OrdenCompraCreate):
    id: str
    aprobadoEUDR: bool
    estado: str

    class Config:
        from_attributes = True

# ─── Bodega: Inventario y Acopio ─────────────────────────────

class BodegaIngresoCreate(BaseModel):
    ordenCompraId: str
    codigoQR: str = Field(..., description="Lectura del código QR del productor")
    pesoIngresado_lb: float = Field(
        ..., gt=0, description="Peso ingresado en la báscula (libras)"
    )
    tipoProceso: TipoProceso = Field(
        ..., description="Lavado, Honey o Natural para validación de saco"
    )

class InventarioAcopioOut(BaseModel):
    id: str
    ordenCompraId: str
    pesoIngresoKg: float
    pesoSalidaKg: float
    estado: str

    class Config:
        from_attributes = True


# --- Procesamiento: Trilla ---

class TrillaCreate(BaseModel):
    inventarioId: str
    factorRendimiento: float = Field(
        ...,
        ge=0.78,
        le=0.82,
        description="El factor dinámico debe mantenerse en el rango configurado de 0.78 a 0.82"
    )

class TrillaOut(BaseModel):
    id: str
    inventarioId: str
    factorRendimiento: float
    pesoEntradaKg: float
    pesoOroKg: float
    mermaKg: float

    class Config:
        from_attributes = True

# ─── Exportación y Despacho ──────────────────────────────────

class DespachoCreate(BaseModel):
    inventarioId: str
    peso_salida_kg: float = Field(..., gt=0, description="Peso exacto en KG a despachar")
    destino: str = Field(..., description="Puerto, cliente o destino final")