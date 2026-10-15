import type { IdVista } from "./rutas.ts";

// Pipeline de trazabilidad: qué se registra en cada etapa del café y dónde queda cada dato.
// Es la fuente única para el panel (V1), las fichas de fase (V4-V8) y sus formularios.
//
// Toma como referencia el modelo de SGTC-Trazabilidad (parcela → lote → semilla → fases con
// trabajadores y fechas) y lo ajusta al contrato de HAContract, que es quien manda:
//   - "storage": lo guarda el contrato (struct Lot, Finca o saldo ERC-1155). Lo leen las reglas.
//   - "evento":  va como argumento de un evento. Inmutable y legible por RPC, sin coste de storage.
//   - "ipfs":    va en el documento JSON del lote (lot/v1) o de la finca (finca/v1). On-chain solo
//                queda su CID y su keccak256 (dataHash), así que cualquier cambio se detecta.
//   - "privado": se queda en Postgres. Datos personales o comerciales (LOPDP / GDPR, ADR-002).
// Los campos "propuesto" vienen de SGTC y caben sin tocar el contrato; la nota dice qué falta.
// Módulo puro: se prueba con node:test.

export type Destino = "storage" | "evento" | "ipfs" | "privado";

export const DESTINOS: readonly Destino[] = ["storage", "evento", "ipfs", "privado"];

export const DESTINO_INFO: Record<Destino, { titulo: string; resumen: string; icono: string }> = {
  storage: {
    titulo: "On-chain · contrato",
    resumen: "Lo guarda el contrato y lo usan sus reglas (estado, finca, gramos).",
    icono: "deployed_code",
  },
  evento: {
    titulo: "On-chain · evento",
    resumen: "Queda en el log de la transacción: inmutable y público, sin coste de almacenamiento.",
    icono: "receipt_long",
  },
  ipfs: {
    titulo: "Off-chain · IPFS",
    resumen: "Documento JSON público. On-chain van su CID y su hash, así que no se puede alterar.",
    icono: "cloud",
  },
  privado: {
    titulo: "Off-chain · privado",
    resumen: "Se queda en la base de datos de la cooperativa. Nunca sale a la cadena ni a IPFS.",
    icono: "lock",
  },
};

/** Estados del lote en TraceabilityController (enum LotState, en orden). */
export const ESTADOS_LOTE = ["HARVESTED", "PROCESSED", "DRIED", "HULLED", "GRADED", "PACKAGED", "EXPORTED"] as const;
export type EstadoLote = (typeof ESTADOS_LOTE)[number];

/** Forma física del café (enum Form). */
export type Forma = "CHERRY" | "PARCHMENT" | "GREEN";
export const FORMA_ETIQUETA: Record<Forma, string> = { CHERRY: "Cereza", PARCHMENT: "Pergamino", GREEN: "Verde (oro)" };

export type Rol = "RELAYER_ROLE" | "AUDITOR_ROLE" | "FARMER_ROLE" | "PROCESSOR_ROLE" | "GRADER_ROLE" | "EXPORTER_ROLE" | "CUSTODIO";
export const ROL_ETIQUETA: Record<Rol, string> = {
  RELAYER_ROLE: "Cooperativa (relayer)",
  AUDITOR_ROLE: "Auditor EUDR",
  FARMER_ROLE: "Productor",
  PROCESSOR_ROLE: "Beneficio",
  GRADER_ROLE: "Q-Grader",
  EXPORTER_ROLE: "Exportador",
  CUSTODIO: "Custodio actual o relayer",
};

export type TipoCampo = "texto" | "numero" | "fecha" | "opcion" | "direccion" | "archivo" | "booleano" | "hash" | "lista";

export interface Opcion {
  valor: string;
  etiqueta: string;
}

export interface CampoPipeline {
  /** Parámetro del contrato o clave dentro de `properties.phase` del documento lot/v1. */
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  destino: Destino;
  obligatorio: boolean;
  /** "vigente": lo admiten hoy el contrato y los esquemas. "propuesto": viene de SGTC. */
  estado: "vigente" | "propuesto";
  unidad?: string;
  /** Límites en la unidad que ve el usuario. */
  min?: number;
  max?: number;
  opciones?: readonly Opcion[];
  /** Cómo pasa de la vista a la cadena (escala, tipo Solidity). */
  codificacion?: string;
  /** Campo o fase equivalente en SGTC-Trazabilidad. */
  sgtc?: string;
  nota?: string;
}

export type IdEtapa =
  | "origen"
  | "cosecha"
  | "beneficio"
  | "secado"
  | "trilla"
  | "cata"
  | "empaque"
  | "exportacion"
  | "custodia";

export interface EtapaPipeline {
  id: IdEtapa;
  titulo: string;
  descripcion: string;
  icono: string;
  /** Estado del lote al terminar la etapa; null en origen y custodia. */
  estado: EstadoLote | null;
  /** Estado que exige el contrato para registrar la etapa. */
  requiere: readonly EstadoLote[] | null;
  /** Forma física al terminar; si cambia, el contrato quema el id y acuña uno nuevo. */
  forma: Forma | null;
  cambiaId: boolean;
  rol: Rol;
  contrato: "OriginRegistry" | "TraceabilityController";
  funciones: readonly string[];
  eventos: readonly string[];
  /** Vista de HAFront que la registra (null: fuera del módulo web por ahora). */
  vista: IdVista | null;
  hu: string;
  /** Fases de SGTC que cubre. */
  sgtc: readonly string[];
  /** Se puede registrar en cualquier momento antes de exportar, no avanza el estado. */
  transversal: boolean;
  campos: readonly CampoPipeline[];
}

// Campos que SGTC registra en todas las fases (tabla lote_fase y trabajador_lote_fase).
const FECHAS_FASE: readonly CampoPipeline[] = [
  {
    clave: "fechaInicio",
    etiqueta: "Inicio de la fase",
    tipo: "fecha",
    destino: "ipfs",
    obligatorio: false,
    estado: "propuesto",
    sgtc: "lote_fase.fecha_inicio",
    nota: "Va en properties.phase. La fecha de fin es la del bloque.",
  },
  {
    clave: "trabajadores",
    etiqueta: "Personas en la fase",
    tipo: "numero",
    destino: "ipfs",
    obligatorio: false,
    estado: "propuesto",
    unidad: "personas",
    min: 1,
    sgtc: "trabajador_lote_fase (conteo)",
    nota: "Solo el número. Quién trabajó queda en el campo privado siguiente.",
  },
  {
    clave: "equipo",
    etiqueta: "Nombres y cédulas del equipo",
    tipo: "lista",
    destino: "privado",
    obligatorio: false,
    estado: "propuesto",
    sgtc: "personal (nombres, apellidos, identificacion, rol)",
    nota: "Dato personal: no va a IPFS (documentos.ts rechaza nombres y cédulas).",
  },
];

const DATA_HASH: CampoPipeline = {
  clave: "dataHash",
  etiqueta: "Huella del documento",
  tipo: "hash",
  destino: "evento",
  obligatorio: true,
  estado: "vigente",
  codificacion: "keccak256(JSON canónico de lot/v1) → bytes32",
  nota: "Lo calcula la app; no lo escribe el usuario.",
};

const CID: CampoPipeline = {
  clave: "cid",
  etiqueta: "CID del documento lot/v1",
  tipo: "texto",
  destino: "evento",
  obligatorio: true,
  estado: "vigente",
  codificacion: "string; además pasa a ser la URI del token",
  nota: "Lo devuelve POST /api/ipfs/lote.",
};

const GRAMOS = (etiqueta: string, sgtc?: string): CampoPipeline => ({
  clave: "gramsOut",
  etiqueta,
  tipo: "numero",
  destino: "storage",
  obligatorio: true,
  estado: "vigente",
  unidad: "kg",
  min: 0.001,
  codificacion: "kg × 1000 → uint256 gramos (saldo ERC-1155 del id nuevo)",
  ...(sgtc ? { sgtc } : {}),
});

export const ETAPAS: readonly EtapaPipeline[] = [
  {
    id: "origen",
    titulo: "Origen: finca y DDS",
    descripcion: "La finca se ancla con su polígono, pasa la auditoría de deforestación y recibe el certificado DDS.",
    icono: "landscape",
    estado: null,
    requiere: null,
    forma: null,
    cambiaId: false,
    rol: "AUDITOR_ROLE",
    contrato: "OriginRegistry",
    funciones: ["registerFinca", "anchorAudit", "issueDDS"],
    eventos: ["FincaRegistered", "DeforestationAuditAnchored", "DDSIssued"],
    vista: null,
    hu: "HU-01",
    sgtc: ["Parcela", "Sembrado"],
    transversal: false,
    campos: [
      {
        clave: "fincaId",
        etiqueta: "Identificador de la finca",
        tipo: "hash",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        codificacion: "keccak256(uuid de la finca en Postgres) → bytes32",
        sgtc: "parcela.codigo",
      },
      {
        clave: "geoHash",
        etiqueta: "Huella del polígono",
        tipo: "hash",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        codificacion: "keccak256(GeoJSON) → bytes32",
        nota: "El polígono solo se publica en IPFS con consentimiento del productor.",
      },
      {
        clave: "areaHa100",
        etiqueta: "Área total",
        tipo: "numero",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        unidad: "ha",
        min: 0.01,
        codificacion: "ha × 100 → uint32",
        sgtc: "parcela.hectareas",
      },
      {
        clave: "approved",
        etiqueta: "Auditoría de deforestación aprobada",
        tipo: "booleano",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        nota: "Con auditHash (informe GEE) y fechaCorte (31/12/2020 por EUDR).",
      },
      {
        clave: "expiresAt",
        etiqueta: "Vencimiento del DDS",
        tipo: "fecha",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        codificacion: "segundos Unix → uint64",
        nota: "Sin DDS vigente no se puede registrar la cosecha.",
      },
      {
        clave: "provincia",
        etiqueta: "Provincia, cantón y parroquia",
        tipo: "texto",
        destino: "ipfs",
        obligatorio: false,
        estado: "vigente",
        nota: "Documento finca/v1.",
      },
      {
        clave: "altitudMsnm",
        etiqueta: "Altitud",
        tipo: "numero",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        unidad: "m s. n. m.",
        min: 0,
        max: 6000,
        sgtc: "parcela.altitud_msnm",
        nota: "Requiere finca/v2: finca/v1 no admite claves nuevas.",
      },
      {
        clave: "suelo",
        etiqueta: "pH y textura del suelo, orientación de la ladera, cortinas rompevientos",
        tipo: "texto",
        destino: "privado",
        obligatorio: false,
        estado: "propuesto",
        sgtc: "parcela.ph_suelo, textura, orientacion_ladera, cortinas_rompevientos",
        nota: "Dato agronómico del Módulo 1. Se publica solo si se pasa a finca/v2.",
      },
      {
        clave: "propietario",
        etiqueta: "Productor y escritura",
        tipo: "texto",
        destino: "privado",
        obligatorio: true,
        estado: "vigente",
        nota: "Dato personal.",
      },
    ],
  },
  {
    id: "cosecha",
    titulo: "Cosecha",
    descripcion: "Nace el lote de cereza y su token ERC-1155, ligado a la finca y a su DDS vigente.",
    icono: "agriculture",
    estado: "HARVESTED",
    requiere: null,
    forma: "CHERRY",
    cambiaId: true,
    rol: "FARMER_ROLE",
    contrato: "TraceabilityController",
    funciones: ["registerHarvest"],
    eventos: ["HarvestRegistered"],
    vista: "V2",
    hu: "HU-02",
    sgtc: ["Cosecha", "Lote", "Semilla"],
    transversal: false,
    campos: [
      {
        clave: "fincaId",
        etiqueta: "Finca",
        tipo: "opcion",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        sgtc: "lote.parcela_id",
        nota: "Solo fincas con DDS vigente.",
      },
      {
        clave: "harvestDate",
        etiqueta: "Fecha de cosecha",
        tipo: "fecha",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        codificacion: "mediodía de Ecuador en segundos → uint64; nunca futura",
      },
      {
        clave: "grams",
        etiqueta: "Peso de cereza",
        tipo: "numero",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        unidad: "kg",
        min: 0.001,
        codificacion: "kg × 1000 → uint256 gramos (saldo ERC-1155)",
      },
      {
        clave: "variety",
        etiqueta: "Variedad",
        tipo: "texto",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        codificacion: "texto → bytes32 (hasta 31 bytes)",
        sgtc: "semilla.variedad",
      },
      {
        clave: "ripeness",
        etiqueta: "Madurez",
        tipo: "opcion",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        opciones: [
          { valor: "RIPE", etiqueta: "Madura" },
          { valor: "OVERRIPE", etiqueta: "Sobremadura" },
          { valor: "UNDERRIPE", etiqueta: "Verde" },
        ],
        codificacion: "enum Ripeness → uint8",
      },
      {
        clave: "holder",
        etiqueta: "Custodio inicial",
        tipo: "direccion",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        nota: "Wallet del productor o su dirección custodial.",
      },
      {
        clave: "image",
        etiqueta: "Foto del lote",
        tipo: "archivo",
        destino: "ipfs",
        obligatorio: true,
        estado: "vigente",
        nota: "JPG, PNG o WebP hasta 8 MB, sin personas.",
      },
      {
        clave: "observaciones",
        etiqueta: "Observaciones",
        tipo: "texto",
        destino: "ipfs",
        obligatorio: false,
        estado: "vigente",
        nota: "Se rechaza si parece llevar un correo, cédula o teléfono.",
      },
      {
        clave: "loteCampo",
        etiqueta: "Lote o zona de la finca",
        tipo: "texto",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        sgtc: "lote.codigo (A1, B2…) y lote.tipo_zona",
      },
      {
        clave: "hectareasLote",
        etiqueta: "Hectáreas cosechadas",
        tipo: "numero",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        unidad: "ha",
        min: 0.01,
        sgtc: "lote.hectareas_asignadas",
      },
      {
        clave: "semillaOrigen",
        etiqueta: "Origen de la semilla",
        tipo: "texto",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        sgtc: "semilla.origen",
        nota: "El distribuidor y la factura de la semilla quedan privados.",
      },
      ...FECHAS_FASE,
    ],
  },
  {
    id: "beneficio",
    titulo: "Beneficio húmedo",
    descripcion: "Despulpado, fermentación y lavado. El lote sigue siendo cereza.",
    icono: "water_drop",
    estado: "PROCESSED",
    requiere: ["HARVESTED"],
    forma: "CHERRY",
    cambiaId: false,
    rol: "PROCESSOR_ROLE",
    contrato: "TraceabilityController",
    funciones: ["logProcessing"],
    eventos: ["LotProcessed", "LotStateChanged"],
    vista: "V4",
    hu: "HU-03",
    sgtc: ["Despulpado"],
    transversal: false,
    campos: [
      {
        clave: "processType",
        etiqueta: "Proceso",
        tipo: "opcion",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        opciones: [
          { valor: "WASHED", etiqueta: "Lavado" },
          { valor: "NATURAL", etiqueta: "Natural" },
          { valor: "HONEY", etiqueta: "Honey" },
        ],
        codificacion: "enum ProcessType → uint8",
      },
      {
        clave: "fermentationHours",
        etiqueta: "Fermentación",
        tipo: "numero",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        unidad: "h",
        min: 0,
        max: 65535,
        codificacion: "horas enteras → uint16",
      },
      {
        clave: "phX10",
        etiqueta: "pH del mucílago",
        tipo: "numero",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        min: 0.1,
        max: 14,
        codificacion: "pH × 10 → uint8 (1-140)",
      },
      {
        clave: "fuenteAgua",
        etiqueta: "Fuente de agua",
        tipo: "texto",
        destino: "ipfs",
        obligatorio: false,
        estado: "vigente",
        nota: "waterSource del ERS. Va en properties.phase.",
      },
      DATA_HASH,
      CID,
      ...FECHAS_FASE,
    ],
  },
  {
    id: "secado",
    titulo: "Secado",
    descripcion: "La cereza procesada pasa a pergamino seco: el contrato quema el id y acuña uno nuevo.",
    icono: "wb_sunny",
    estado: "DRIED",
    requiere: ["PROCESSED"],
    forma: "PARCHMENT",
    cambiaId: true,
    rol: "PROCESSOR_ROLE",
    contrato: "TraceabilityController",
    funciones: ["logDrying"],
    eventos: ["LotTransformed", "LotDried", "HighMoistureWarning"],
    vista: "V5",
    hu: "HU-04",
    sgtc: ["Secado"],
    transversal: false,
    campos: [
      {
        clave: "method",
        etiqueta: "Método de secado",
        tipo: "opcion",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        opciones: [
          { valor: "PATIO", etiqueta: "Patio / marquesina" },
          { valor: "AFRICAN_BED", etiqueta: "Cama africana" },
          { valor: "MECHANICAL", etiqueta: "Mecánico" },
        ],
        codificacion: "enum DryingMethod → uint8",
        sgtc: "semilla.metodo_secado (marquesinas, camas africanas)",
      },
      {
        clave: "moistureX10",
        etiqueta: "Humedad final",
        tipo: "numero",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        unidad: "%",
        min: 0.1,
        max: 100,
        codificacion: "% × 10 → uint16. Más de 12,5 % emite HighMoistureWarning sin bloquear.",
      },
      GRAMOS("Peso de pergamino seco"),
      {
        clave: "colorPergamino",
        etiqueta: "Color del pergamino",
        tipo: "opcion",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        opciones: [
          { valor: "AMARILLO_PALIDO", etiqueta: "Amarillo pálido uniforme" },
          { valor: "CREMA_CLARO", etiqueta: "Crema claro" },
          { valor: "MARFIL", etiqueta: "Marfil" },
        ],
        sgtc: "semilla.color (ColorPergamino)",
      },
      {
        clave: "integridadPergamino",
        etiqueta: "Integridad del pergamino",
        tipo: "opcion",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        opciones: [
          { valor: "INTACTO_98", etiqueta: "98 % de granos con pergamino intacto" },
          { valor: "SIN_FISURAS", etiqueta: "Sin fisuras ni descascarillado visible" },
        ],
        sgtc: "semilla.integridad_pergamino",
      },
      {
        clave: "olor",
        etiqueta: "Olor",
        tipo: "opcion",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        opciones: [
          { valor: "FRESCO", etiqueta: "Fresco" },
          { valor: "HIERBA_SECA", etiqueta: "A hierba seca" },
          { valor: "PAJA_LIMPIA", etiqueta: "A paja limpia" },
          { valor: "MOHO", etiqueta: "A moho" },
          { valor: "FERMENTO", etiqueta: "A fermento" },
        ],
        sgtc: "semilla.olor (OlorSemilla)",
        nota: "Moho o fermento conviene marcarlos como aviso en la ficha.",
      },
      {
        clave: "diasSecado",
        etiqueta: "Días de secado",
        tipo: "numero",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        unidad: "días",
        min: 1,
        nota: "No está en SGTC; lo pide la ficha de calidad del beneficio.",
      },
      DATA_HASH,
      CID,
      ...FECHAS_FASE,
    ],
  },
  {
    id: "trilla",
    titulo: "Trilla",
    descripcion: "El pergamino pasa a café verde. El contrato acuña otro id; la relación de pesos es el rendimiento.",
    icono: "grain",
    estado: "HULLED",
    requiere: ["DRIED"],
    forma: "GREEN",
    cambiaId: true,
    rol: "PROCESSOR_ROLE",
    contrato: "TraceabilityController",
    funciones: ["logHulling"],
    eventos: ["LotTransformed", "LotStateChanged"],
    vista: "V6",
    hu: "Extra (no está en el ERS)",
    sgtc: [],
    transversal: false,
    campos: [
      GRAMOS("Peso de café verde"),
      {
        clave: "factorRendimiento",
        etiqueta: "Factor de rendimiento",
        tipo: "numero",
        destino: "ipfs",
        obligatorio: true,
        estado: "vigente",
        min: 0,
        max: 1,
        nota: "Se calcula: gramos de verde / gramos de pergamino.",
      },
      {
        clave: "metodoSeleccion",
        etiqueta: "Selección del grano",
        tipo: "opcion",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        opciones: [
          { valor: "MANUAL", etiqueta: "Clasificación manual grano a grano" },
          { valor: "FLOTACION_CRIBADO", etiqueta: "Flotación y cribado por tamaño" },
        ],
        sgtc: "semilla.seleccion (MetodoSeleccion)",
      },
      DATA_HASH,
      CID,
      ...FECHAS_FASE,
    ],
  },
  {
    id: "cata",
    titulo: "Cata SCA",
    descripcion: "Un Q-Grader puntúa el lote de café verde y deja su formulario de cata.",
    icono: "local_cafe",
    estado: "GRADED",
    requiere: ["HULLED"],
    forma: "GREEN",
    cambiaId: false,
    rol: "GRADER_ROLE",
    contrato: "TraceabilityController",
    funciones: ["addCupping"],
    eventos: ["LotGraded", "LotStateChanged"],
    vista: "V7",
    hu: "HU-05",
    sgtc: [],
    transversal: false,
    campos: [
      {
        clave: "scaScore",
        etiqueta: "Puntaje SCA",
        tipo: "numero",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        min: 0,
        max: 100,
        codificacion: "entero → uint8. El valor con decimales (86,5) va en IPFS.",
      },
      {
        clave: "defects",
        etiqueta: "Defectos",
        tipo: "numero",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        min: 0,
        max: 255,
        codificacion: "uint8",
      },
      {
        clave: "perfilSensorial",
        etiqueta: "Notas sensoriales (fragancia, sabor, acidez, cuerpo…)",
        tipo: "texto",
        destino: "ipfs",
        obligatorio: false,
        estado: "vigente",
      },
      {
        clave: "certificadoQGrader",
        etiqueta: "Certificado del Q-Grader",
        tipo: "archivo",
        destino: "ipfs",
        obligatorio: false,
        estado: "propuesto",
        nota: "HU-05, criterio 2. Lo ideal es anclarlo al conceder GRADER_ROLE.",
      },
      DATA_HASH,
      CID,
    ],
  },
  {
    id: "empaque",
    titulo: "Empaque",
    descripcion: "El lote calificado se divide en sacos o se mezcla con otros. La suma de gramos debe cuadrar.",
    icono: "inventory_2",
    estado: "PACKAGED",
    requiere: ["GRADED", "PACKAGED"],
    forma: "GREEN",
    cambiaId: true,
    rol: "EXPORTER_ROLE",
    contrato: "TraceabilityController",
    funciones: ["split", "merge"],
    eventos: ["LotSplit", "LotMerged"],
    vista: "V8",
    hu: "HU-06",
    sgtc: ["Empaquetado"],
    transversal: false,
    campos: [
      {
        clave: "amounts",
        etiqueta: "Peso de cada saco",
        tipo: "lista",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        unidad: "kg",
        min: 0.001,
        codificacion: "kg × 1000 → uint256[] gramos; la suma no puede pasar del saldo",
      },
      {
        clave: "lotIds",
        etiqueta: "Sacos a mezclar",
        tipo: "lista",
        destino: "storage",
        obligatorio: false,
        estado: "vigente",
        nota: "Solo en merge, mínimo dos. Si son de fincas distintas, el origen sale del linaje.",
      },
      {
        clave: "contenedor",
        etiqueta: "Contenedor o marca de embarque",
        tipo: "texto",
        destino: "ipfs",
        obligatorio: false,
        estado: "vigente",
      },
      CID,
    ],
  },
  {
    id: "exportacion",
    titulo: "Exportación",
    descripcion: "Se cierra el lote con la referencia de la declaración DDS en TRACES.",
    icono: "local_shipping",
    estado: "EXPORTED",
    requiere: ["PACKAGED"],
    forma: "GREEN",
    cambiaId: false,
    rol: "EXPORTER_ROLE",
    contrato: "TraceabilityController",
    funciones: ["markExported"],
    eventos: ["LotExported", "LotStateChanged"],
    vista: "V8",
    hu: "HU-06",
    sgtc: ["Transporte"],
    transversal: false,
    campos: [
      {
        clave: "refDDS",
        etiqueta: "Referencia TRACES / DDS",
        tipo: "texto",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        codificacion: "keccak256(referencia) → bytes32; el texto va en IPFS",
      },
      {
        clave: "destino",
        etiqueta: "Puerto o ciudad de destino",
        tipo: "texto",
        destino: "ipfs",
        obligatorio: false,
        estado: "vigente",
      },
      {
        clave: "comprador",
        etiqueta: "Comprador, factura y precio",
        tipo: "texto",
        destino: "privado",
        obligatorio: false,
        estado: "propuesto",
        nota: "Dato comercial.",
      },
      DATA_HASH,
      CID,
    ],
  },
  {
    id: "custodia",
    titulo: "Traspaso de custodia",
    descripcion: "Mueve gramos de un custodio a otro (productor → beneficio → exportador) con su guía de remisión.",
    icono: "swap_horiz",
    estado: null,
    requiere: ["HARVESTED", "PROCESSED", "DRIED", "HULLED", "GRADED", "PACKAGED"],
    forma: null,
    cambiaId: false,
    rol: "CUSTODIO",
    contrato: "TraceabilityController",
    funciones: ["transferCustody"],
    eventos: ["CustodyTransferred"],
    vista: "V3",
    hu: "HU-06",
    sgtc: ["Transporte"],
    transversal: true,
    campos: [
      {
        clave: "to",
        etiqueta: "Nuevo custodio",
        tipo: "direccion",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        nota: "Pasa a tener el saldo del token.",
      },
      {
        clave: "grams",
        etiqueta: "Peso que se entrega",
        tipo: "numero",
        destino: "storage",
        obligatorio: true,
        estado: "vigente",
        unidad: "kg",
        min: 0.001,
        codificacion: "kg × 1000 → uint256 gramos",
      },
      {
        clave: "dataHash",
        etiqueta: "Huella de la guía de remisión",
        tipo: "hash",
        destino: "evento",
        obligatorio: true,
        estado: "vigente",
        codificacion: "keccak256(guía) → bytes32",
      },
      {
        clave: "guia",
        etiqueta: "Guía de remisión, transportista y placa",
        tipo: "texto",
        destino: "privado",
        obligatorio: true,
        estado: "propuesto",
        sgtc: "Transporte",
        nota: "On-chain solo su hash; con la guía en mano cualquiera puede comprobarla.",
      },
    ],
  },
];

/** Etapas que hace avanzar el estado del lote, en orden. */
export const ETAPAS_LINEALES: readonly EtapaPipeline[] = ETAPAS.filter((e) => !e.transversal);

/** Correspondencia de las fases de SGTC-Trazabilidad con el pipeline. */
export const FASES_SGTC: readonly { fase: string; etapa: IdEtapa | null; nota: string }[] = [
  { fase: "Sembrado", etapa: "origen", nota: "La finca y su variedad se registran al anclar la finca; la siembra no genera token." },
  { fase: "Cosecha", etapa: "cosecha", nota: "Igual: nace el lote." },
  { fase: "Despulpado", etapa: "beneficio", nota: "Junto con fermentación y lavado (HU-03)." },
  { fase: "Secado", etapa: "secado", nota: "Igual, con humedad y aviso de 12,5 %." },
  { fase: "Tostado", etapa: null, nota: "Lo hace el tostador después de exportar. Fuera del contrato actual." },
  { fase: "Molido", etapa: null, nota: "Igual que el tostado: fuera del contrato actual." },
  { fase: "Empaquetado", etapa: "empaque", nota: "split / merge de sacos." },
  { fase: "Transporte", etapa: "custodia", nota: "Traspaso de custodia con guía de remisión; el embarque final es la exportación." },
];

export function obtenerEtapa(id: IdEtapa): EtapaPipeline {
  const etapa = ETAPAS.find((e) => e.id === id);
  if (!etapa) throw new Error(`Etapa desconocida: ${id}`);
  return etapa;
}

/** Etapa que deja el lote en `estado`. Acepta el nombre o el índice del enum LotState. */
export function etapaPorEstado(estado: EstadoLote | number): EtapaPipeline | null {
  const nombre = typeof estado === "number" ? ESTADOS_LOTE[estado] : estado;
  if (nombre === undefined) return null;
  return ETAPAS_LINEALES.find((e) => e.estado === nombre) ?? null;
}

export type Avance = "hecha" | "actual" | "pendiente";

/**
 * Avance de cada etapa lineal para un lote en `estado` (null: el lote todavía no existe, solo
 * la finca). El origen siempre está hecho si hay lote. Sirve a la ficha del lote (V3).
 */
export function avanceDelLote(estado: EstadoLote | number | null): { etapa: EtapaPipeline; avance: Avance }[] {
  const actual = estado === null ? null : etapaPorEstado(estado);
  if (estado !== null && !actual) throw new Error(`Estado de lote desconocido: ${String(estado)}`);
  const indiceActual = actual ? ETAPAS_LINEALES.indexOf(actual) : 0;
  return ETAPAS_LINEALES.map((etapa, i) => ({
    etapa,
    avance: i < indiceActual ? "hecha" : i === indiceActual ? "actual" : "pendiente",
  }));
}

/** Campos de una etapa agrupados por destino, en el orden de DESTINOS. */
export function camposPorDestino(etapa: EtapaPipeline): { destino: Destino; campos: CampoPipeline[] }[] {
  return DESTINOS.map((destino) => ({ destino, campos: etapa.campos.filter((c) => c.destino === destino) })).filter(
    (g) => g.campos.length > 0,
  );
}

/** Cuántos campos van a cada destino en todo el pipeline (solo los vigentes si se pide). */
export function resumenDestinos(soloVigentes = false): Record<Destino, number> {
  const resumen: Record<Destino, number> = { storage: 0, evento: 0, ipfs: 0, privado: 0 };
  for (const etapa of ETAPAS) {
    for (const c of etapa.campos) if (!soloVigentes || c.estado === "vigente") resumen[c.destino]++;
  }
  return resumen;
}

/** Campos que hoy no admite el contrato o los esquemas y que vienen de SGTC. */
export function camposPropuestos(): { etapa: IdEtapa; campo: CampoPipeline }[] {
  return ETAPAS.flatMap((etapa) =>
    etapa.campos.filter((c) => c.estado === "propuesto").map((campo) => ({ etapa: etapa.id, campo })),
  );
}
