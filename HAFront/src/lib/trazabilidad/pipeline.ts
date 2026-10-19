// Definición del pipeline de trazabilidad que se ancla on-chain.
// Combina el Módulo 1 de Huella de Altura (Finca → Expediente → Auditoría GEE → DDS)
// con el modelo de SGTC-Trazabilidad (Parcela → Lote → Semilla → 8 fases con trabajadores).
// Es la fuente legible por máquina de HAContract/smart_contract.md: si cambia una etapa
// o un campo aquí, actualizar también la especificación.
import { encodeAbiParameters, keccak256, zeroHash, type Hex } from "viem";
import { canonicalJson, hashJson, hashTexto } from "./hash";

export const SCHEMA_VERSION = "huella.trazabilidad/v1";

export type EtapaId =
  | "ORIGEN"
  | "CUMPLIMIENTO_EUDR"
  | "SEMILLA"
  | "SEMBRADO"
  | "COSECHA"
  | "DESPULPADO"
  | "SECADO"
  | "TOSTADO"
  | "MOLIDO"
  | "EMPAQUETADO"
  | "TRANSPORTE";

/** EstadoFase de SGTC. Solo las etapas "Completada" se escriben on-chain. */
export type EstadoEtapa = "Pendiente" | "En Proceso" | "Completada";

/** De dónde sale el dato hoy: modelo existente en HuellaAltura, en SGTC, o campo nuevo propuesto. */
export type Fuente = "HuellaAltura" | "SGTC" | "Propuesto";

/** `publico`: va en claro en el payload hasheado. `privado`: solo BD; en el payload va su compromiso. */
export type Visibilidad = "publico" | "privado";

/** Rol del contrato que firma la etapa. */
export type Firmante = "OPERADOR" | "AUDITOR";

export interface CampoDef {
  clave: string;
  etiqueta: string;
  visibilidad: Visibilidad;
  fuente: Fuente;
  /** Modelo.campo en la fuente, o cómo se deriva. */
  origen: string;
  unidad?: string;
}

export interface RegistroEtapa {
  estado: EstadoEtapa;
  /** ISO 8601 UTC. */
  fechaInicio?: string;
  fechaFin?: string;
  /** Masa de salida de la etapa; on-chain se guarda en gramos. */
  cantidadKg?: number;
  /** Campos `publico` de la etapa, por clave. */
  datos: Record<string, unknown>;
  /** Campos `privado`: nunca salen del servidor ni se envían al navegador. */
  privado?: Record<string, unknown>;
  /** Presente cuando la etapa ya fue escrita en el contrato. */
  anclaje?: { txHash: Hex; bloque: number };
}

export interface LoteTrazable {
  tenant: string;
  codigo: string;
  /** Sal secreta del lote para los compromisos de datos privados. Solo servidor. */
  sal: string;
  etapas: Partial<Record<EtapaId, RegistroEtapa>>;
}

export interface Regla {
  texto: string;
  /** Dónde se hace cumplir: en el contrato (on-chain) o en exped-service antes de enviar la tx. */
  donde: "contrato" | "backend";
  /** Sin función, la regla se documenta pero no se puede verificar con los datos de la etapa. */
  cumple?: (r: RegistroEtapa) => boolean;
}

export interface EtapaDef {
  id: EtapaId;
  nombre: string;
  icono: string;
  descripcion: string;
  firmante: Firmante;
  /** Endpoint/acción que dispara el anclaje. */
  disparador: string;
  /** Qué representa `cantidadG` en esta etapa; sin valor la etapa no mueve masa. */
  cantidad?: string;
  campos: CampoDef[];
  reglas: Regla[];
}

const trabajadores: CampoDef[] = [
  {
    clave: "trabajadores_total",
    etiqueta: "Trabajadores asignados",
    visibilidad: "publico",
    fuente: "SGTC",
    origen: "count(TrabajadorLoteFase)",
  },
  {
    clave: "trabajadores_por_rol",
    etiqueta: "Trabajadores por rol",
    visibilidad: "publico",
    fuente: "SGTC",
    origen: "Personal.rol agrupado",
  },
  {
    clave: "trabajadores",
    etiqueta: "Datos de los trabajadores",
    visibilidad: "privado",
    fuente: "SGTC",
    origen: "Personal.nombres, apellidos, identificacion, telefono",
  },
];

const porRol = (r: RegistroEtapa) => (r.datos.trabajadores_por_rol ?? {}) as Record<string, number>;

export const ETAPAS: EtapaDef[] = [
  {
    id: "ORIGEN",
    nombre: "Origen",
    icono: "location_on",
    descripcion:
      "Finca, parcela y lote de donde proviene el café.",
    firmante: "OPERADOR",
    disparador: "POST /lotes (SGTC crear_lotes) → registrarLote()",
    campos: [
      { clave: "tenant", etiqueta: "Organización", visibilidad: "publico", fuente: "HuellaAltura", origen: "Expediente.organizacion_inquilino" },
      { clave: "finca_eudr_id", etiqueta: "Código EUDR de la finca", visibilidad: "publico", fuente: "HuellaAltura", origen: "Finca.eudr_id" },
      { clave: "finca_nombre", etiqueta: "Finca", visibilidad: "publico", fuente: "HuellaAltura", origen: "Finca.nombre" },
      { clave: "provincia", etiqueta: "Provincia", visibilidad: "publico", fuente: "HuellaAltura", origen: "Finca.provincia" },
      { clave: "canton", etiqueta: "Cantón", visibilidad: "publico", fuente: "HuellaAltura", origen: "Finca.canton" },
      { clave: "parroquia", etiqueta: "Parroquia", visibilidad: "publico", fuente: "HuellaAltura", origen: "Finca.parroquia" },
      { clave: "tenencia", etiqueta: "Tenencia", visibilidad: "publico", fuente: "HuellaAltura", origen: "Finca.tenencia" },
      { clave: "area_total_ha", etiqueta: "Área total", visibilidad: "publico", fuente: "HuellaAltura", origen: "Finca.area_total_ha", unidad: "ha" },
      { clave: "centroide", etiqueta: "Ubicación aproximada", visibilidad: "publico", fuente: "HuellaAltura", origen: "Finca.latitud/longitud redondeadas a 2 decimales" },
      { clave: "poligono_hash", etiqueta: "Huella digital del polígono", visibilidad: "publico", fuente: "HuellaAltura", origen: "keccak256(JSON canónico de Finca.poligono)" },
      { clave: "parcela_codigo", etiqueta: "Parcela", visibilidad: "publico", fuente: "SGTC", origen: "Parcela.codigo" },
      { clave: "tipo_terreno", etiqueta: "Tipo de terreno", visibilidad: "publico", fuente: "SGTC", origen: "Parcela.tipo_terreno" },
      { clave: "altitud_msnm", etiqueta: "Altitud", visibilidad: "publico", fuente: "SGTC", origen: "Parcela.altitud_msnm", unidad: "msnm" },
      { clave: "ph_suelo", etiqueta: "pH del suelo", visibilidad: "publico", fuente: "SGTC", origen: "Parcela.ph_suelo" },
      { clave: "textura", etiqueta: "Textura del suelo", visibilidad: "publico", fuente: "SGTC", origen: "Parcela.textura" },
      { clave: "orientacion_ladera", etiqueta: "Orientación de ladera", visibilidad: "publico", fuente: "SGTC", origen: "Parcela.orientacion_ladera" },
      { clave: "cortinas_rompevientos", etiqueta: "Cortinas rompevientos", visibilidad: "publico", fuente: "SGTC", origen: "Parcela.cortinas_rompevientos" },
      { clave: "lote_codigo", etiqueta: "Código de lote", visibilidad: "publico", fuente: "SGTC", origen: "Lote.codigo ({parcela}-L{n})" },
      { clave: "hectareas_asignadas", etiqueta: "Hectáreas del lote", visibilidad: "publico", fuente: "SGTC", origen: "Lote.hectareas_asignadas", unidad: "ha" },
      { clave: "tipo_zona", etiqueta: "Zona", visibilidad: "publico", fuente: "SGTC", origen: "Lote.tipo_zona" },
      { clave: "poligono", etiqueta: "Polígono GeoJSON exacto", visibilidad: "privado", fuente: "HuellaAltura", origen: "Finca.poligono" },
      { clave: "coordenadas", etiqueta: "Latitud / longitud exactas", visibilidad: "privado", fuente: "HuellaAltura", origen: "Finca.latitud, Finca.longitud" },
      { clave: "productor_id", etiqueta: "Productor", visibilidad: "privado", fuente: "HuellaAltura", origen: "Finca.usuario_id (auth-service)" },
    ],
    reglas: [
      { texto: "La finca tiene EUDR ID asignado", donde: "backend", cumple: (r) => Boolean(r.datos.finca_eudr_id) },
      {
        texto: "Terreno regular: el lote tiene al menos 1 ha",
        donde: "backend",
        cumple: (r) => r.datos.tipo_terreno !== "Regular" || Number(r.datos.hectareas_asignadas) >= 1,
      },
      { texto: "El lote no existía on-chain (loteId único)", donde: "contrato" },
    ],
  },
  {
    id: "CUMPLIMIENTO_EUDR",
    nombre: "Cumplimiento EUDR",
    icono: "verified_user",
    descripcion:
      "Auditoría satelital sin deforestación desde el 31/12/2020 y certificado de debida diligencia (DDS) de la finca.",
    firmante: "AUDITOR",
    disparador: "POST /certificados (DDS emitido) → registrarEtapa()",
    campos: [
      { clave: "expediente_estado", etiqueta: "Estado del expediente", visibilidad: "publico", fuente: "HuellaAltura", origen: "Expediente.estado" },
      { clave: "gee_resultado", etiqueta: "Resultado de la auditoría satelital", visibilidad: "publico", fuente: "HuellaAltura", origen: "Auditoria.resultado" },
      { clave: "deforestacion_detectada", etiqueta: "Deforestación detectada", visibilidad: "publico", fuente: "HuellaAltura", origen: "Auditoria.deforestacion_detectada" },
      { clave: "fecha_corte", etiqueta: "Fecha de corte", visibilidad: "publico", fuente: "HuellaAltura", origen: "Auditoria.fecha_corte" },
      { clave: "fuente_satelital", etiqueta: "Fuente satelital", visibilidad: "publico", fuente: "HuellaAltura", origen: "Auditoria.fuente" },
      { clave: "dds_codigo", etiqueta: "Código DDS", visibilidad: "publico", fuente: "HuellaAltura", origen: "Certificado.codigo_certificado" },
      { clave: "dds_estado", etiqueta: "Estado DDS", visibilidad: "publico", fuente: "HuellaAltura", origen: "Certificado.estado" },
      { clave: "dds_vencimiento", etiqueta: "Vencimiento DDS", visibilidad: "publico", fuente: "HuellaAltura", origen: "Certificado.fecha_vencimiento" },
      { clave: "dds_documento_hash", etiqueta: "Huella digital del certificado DDS", visibilidad: "publico", fuente: "Propuesto", origen: "SHA-256 del archivo en Certificado.url_documento" },
      { clave: "total_stock_carbono", etiqueta: "Stock de carbono", visibilidad: "publico", fuente: "HuellaAltura", origen: "Dato.total_stock_carbono", unidad: "tC/ha" },
      { clave: "cobertura_forestal", etiqueta: "Cobertura forestal", visibilidad: "publico", fuente: "HuellaAltura", origen: "Dato.cobertura_forestal" },
      { clave: "auditor_id", etiqueta: "Auditor", visibilidad: "privado", fuente: "HuellaAltura", origen: "Auditoria.ejecutado_por / Certificado.generado_por" },
      { clave: "observaciones", etiqueta: "Observaciones de auditoría", visibilidad: "privado", fuente: "HuellaAltura", origen: "Auditoria.observaciones" },
    ],
    reglas: [
      {
        texto: "Auditoría satelital aprobada, sin deforestación",
        donde: "backend",
        cumple: (r) => r.datos.gee_resultado === "APROBADO" && r.datos.deforestacion_detectada === false,
      },
      { texto: "Fecha de corte: 31/12/2020", donde: "backend", cumple: (r) => r.datos.fecha_corte === "2020-12-31" },
      { texto: "Certificado DDS vigente", donde: "backend", cumple: (r) => r.datos.dds_estado === "VIGENTE" },
      { texto: "Firmado por una wallet con AUDITOR_ROLE", donde: "contrato" },
    ],
  },
  {
    id: "SEMILLA",
    nombre: "Semilla",
    icono: "grain",
    descripcion: "Material de siembra asignado al lote al iniciar la producción.",
    firmante: "OPERADOR",
    disparador: "POST /lotes/{id}/iniciar-etapa (SGTC) → registrarEtapa()",
    campos: [
      { clave: "variedad", etiqueta: "Variedad", visibilidad: "publico", fuente: "SGTC", origen: "Semilla.variedad" },
      { clave: "origen", etiqueta: "Origen de la semilla", visibilidad: "publico", fuente: "SGTC", origen: "Semilla.origen" },
      { clave: "distribuidor", etiqueta: "Distribuidor", visibilidad: "publico", fuente: "SGTC", origen: "Semilla.distribuidor" },
      { clave: "metodo_secado", etiqueta: "Método de secado", visibilidad: "publico", fuente: "SGTC", origen: "Semilla.metodo_secado" },
      { clave: "seleccion", etiqueta: "Método de selección", visibilidad: "publico", fuente: "SGTC", origen: "Semilla.seleccion" },
      { clave: "olor", etiqueta: "Olor", visibilidad: "publico", fuente: "SGTC", origen: "Semilla.olor" },
      { clave: "color", etiqueta: "Color del pergamino", visibilidad: "publico", fuente: "SGTC", origen: "Semilla.color" },
      { clave: "integridad_pergamino", etiqueta: "Integridad del pergamino", visibilidad: "publico", fuente: "SGTC", origen: "Semilla.integridad_pergamino" },
      { clave: "anexo_hash", etiqueta: "Huella digital del certificado de semilla", visibilidad: "publico", fuente: "SGTC", origen: "SHA-256 del archivo en Semilla.anexo_ruta" },
    ],
    reglas: [
      { texto: "El lote estaba recién creado", donde: "backend" },
      { texto: "Variedad de semilla registrada", donde: "backend", cumple: (r) => Boolean(r.datos.variedad) },
    ],
  },
  {
    id: "SEMBRADO",
    nombre: "Sembrado",
    icono: "potted_plant",
    descripcion: "Siembra de las plantas en el lote.",
    firmante: "OPERADOR",
    disparador: "LoteFase(Sembrado).estado = Completada → registrarEtapa()",
    campos: [
      { clave: "plantas_sembradas", etiqueta: "Plantas sembradas", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      { clave: "densidad_plantas_ha", etiqueta: "Densidad", visibilidad: "publico", fuente: "Propuesto", origen: "plantas_sembradas / Lote.hectareas_asignadas", unidad: "plantas/ha" },
      ...trabajadores,
    ],
    reglas: [
      {
        texto: "Al menos un agricultor asignado",
        donde: "backend",
        cumple: (r) => (porRol(r).Agricultor ?? 0) >= 1,
      },
    ],
  },
  {
    id: "COSECHA",
    nombre: "Cosecha",
    icono: "agriculture",
    descripcion: "Recolección de cereza madura.",
    firmante: "OPERADOR",
    disparador: "LoteFase(Cosecha).estado = Completada → registrarEtapa()",
    cantidad: "Cereza cosechada",
    campos: [
      { clave: "tipo_cosecha", etiqueta: "Tipo de cosecha", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      { clave: "pases", etiqueta: "Pases de recolección", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      { clave: "madurez_pct", etiqueta: "Cereza madura", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase", unidad: "%" },
      ...trabajadores,
    ],
    reglas: [],
  },
  {
    id: "DESPULPADO",
    nombre: "Despulpado",
    icono: "water_drop",
    descripcion: "Retiro de pulpa y fermentación.",
    firmante: "OPERADOR",
    disparador: "LoteFase(Despulpado).estado = Completada → registrarEtapa()",
    cantidad: "Pergamino húmedo",
    campos: [
      { clave: "kg_entrada", etiqueta: "Cereza recibida", visibilidad: "publico", fuente: "Propuesto", origen: "cantidad de la etapa anterior", unidad: "kg" },
      { clave: "proceso", etiqueta: "Proceso", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      { clave: "horas_fermentacion", etiqueta: "Fermentación", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase", unidad: "h" },
      ...trabajadores,
    ],
    reglas: [],
  },
  {
    id: "SECADO",
    nombre: "Secado",
    icono: "light_mode",
    descripcion: "Secado del pergamino hasta humedad de almacenamiento.",
    firmante: "OPERADOR",
    disparador: "LoteFase(Secado).estado = Completada → registrarEtapa()",
    cantidad: "Pergamino seco",
    campos: [
      { clave: "kg_entrada", etiqueta: "Pergamino húmedo recibido", visibilidad: "publico", fuente: "Propuesto", origen: "cantidad de la etapa anterior", unidad: "kg" },
      { clave: "metodo_secado", etiqueta: "Método de secado", visibilidad: "publico", fuente: "SGTC", origen: "enum MetodoSecado" },
      { clave: "humedad_final_pct", etiqueta: "Humedad final", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase", unidad: "%" },
      { clave: "dias_secado", etiqueta: "Días de secado", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase", unidad: "días" },
      ...trabajadores,
    ],
    reglas: [
      {
        texto: "Humedad final entre 10 % y 12 %",
        donde: "backend",
        cumple: (r) => Number(r.datos.humedad_final_pct) >= 10 && Number(r.datos.humedad_final_pct) <= 12,
      },
    ],
  },
  {
    id: "TOSTADO",
    nombre: "Tostado",
    icono: "local_fire_department",
    descripcion: "Tueste del café verde (tras la trilla del pergamino).",
    firmante: "OPERADOR",
    disparador: "LoteFase(Tostado).estado = Completada → registrarEtapa()",
    cantidad: "Café tostado",
    campos: [
      { clave: "kg_verde_entrada", etiqueta: "Café verde recibido", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase", unidad: "kg" },
      { clave: "perfil_tueste", etiqueta: "Perfil de tueste", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      { clave: "temperatura_final_c", etiqueta: "Temperatura final", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase", unidad: "°C" },
      { clave: "tiempo_tueste_min", etiqueta: "Tiempo de tueste", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase", unidad: "min" },
      ...trabajadores,
    ],
    reglas: [],
  },
  {
    id: "MOLIDO",
    nombre: "Molido",
    icono: "blender",
    descripcion: "Molienda (o grano entero) según presentación comercial.",
    firmante: "OPERADOR",
    disparador: "LoteFase(Molido).estado = Completada → registrarEtapa()",
    cantidad: "Café molido",
    campos: [
      { clave: "tipo_molienda", etiqueta: "Tipo de molienda", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      ...trabajadores,
    ],
    reglas: [],
  },
  {
    id: "EMPAQUETADO",
    nombre: "Empaquetado",
    icono: "inventory_2",
    descripcion: "Unidades de venta; cada empaque lleva el QR del lote.",
    firmante: "OPERADOR",
    disparador: "LoteFase(Empaquetado).estado = Completada → registrarEtapa()",
    cantidad: "Café empacado",
    campos: [
      { clave: "unidades", etiqueta: "Unidades", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      { clave: "peso_neto_g", etiqueta: "Peso neto por unidad", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase", unidad: "g" },
      { clave: "tipo_empaque", etiqueta: "Tipo de empaque", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      { clave: "consumo_preferente", etiqueta: "Consumo preferente", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      ...trabajadores,
    ],
    reglas: [
      {
        texto: "Unidades × peso neto = cantidad empacada",
        donde: "backend",
        cumple: (r) =>
          r.cantidadKg === undefined ||
          Math.abs((Number(r.datos.unidades) * Number(r.datos.peso_neto_g)) / 1000 - r.cantidadKg) < 0.001,
      },
    ],
  },
  {
    id: "TRANSPORTE",
    nombre: "Transporte",
    icono: "local_shipping",
    descripcion: "Despacho del café hacia el comprador.",
    firmante: "OPERADOR",
    disparador: "LoteFase(Transporte).estado = Completada → registrarEtapa()",
    cantidad: "Café despachado",
    campos: [
      { clave: "origen_despacho", etiqueta: "Origen del despacho", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      { clave: "destino_pais", etiqueta: "País de destino", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase (ISO 3166-1)" },
      { clave: "medio", etiqueta: "Medio de transporte", visibilidad: "publico", fuente: "Propuesto", origen: "Nuevo campo en LoteFase" },
      { clave: "guia_remision_hash", etiqueta: "Huella digital de la guía de remisión", visibilidad: "publico", fuente: "Propuesto", origen: "keccak256(número de guía)" },
      { clave: "transportista", etiqueta: "Datos del transportista", visibilidad: "privado", fuente: "Propuesto", origen: "Nuevo registro" },
      ...trabajadores,
    ],
    reglas: [{ texto: "DDS vigente en la fecha de despacho", donde: "backend" }],
  },
];

// ── Cálculo del registro on-chain ─────────────────────────────────────────

export interface ResultadoRegla extends Regla {
  /** `undefined` = no verificable con los datos de la etapa. */
  ok?: boolean;
}

export interface EtapaCalculada {
  def: EtapaDef;
  /** uint8 de la etapa en el contrato. */
  indice: number;
  estado: EstadoEtapa;
  registro?: RegistroEtapa;
  payload?: Record<string, unknown>;
  dataHash?: Hex;
  prevHash?: Hex;
  /** Solo para etapas Completada: lo que el contrato calculará y emitirá. */
  recordHash?: Hex;
  fechaInicio?: bigint;
  fechaFin?: bigint;
  cantidadG?: bigint;
  reglas: ResultadoRegla[];
}

export interface PipelineCalculado {
  loteId: Hex;
  /** tokenId ERC-1155 = uint256(loteId). */
  tokenId: bigint;
  etapas: EtapaCalculada[];
}

export const loteIdDe = (tenant: string, codigo: string): Hex => hashTexto(`${tenant}:${codigo}`);

const unix = (iso?: string) => (iso ? BigInt(Math.floor(Date.parse(iso) / 1000)) : 0n);

/** Compromiso de los datos privados; la sal es por lote y se mezcla con la etapa para no enlazar etapas. */
export function compromisoPrivado(sal: string, etapa: EtapaId, privado: Record<string, unknown>): Hex {
  return hashTexto(`${sal}|${etapa}|${canonicalJson(privado)}`);
}

/** Payload off-chain cuyo keccak256 es `dataHash`. Las fechas y la masa van en el registro on-chain, no aquí. */
export function payloadEtapa(lote: LoteTrazable, def: EtapaDef, r: RegistroEtapa): Record<string, unknown> {
  const tienePrivado = r.privado && Object.keys(r.privado).length > 0;
  return {
    schema: SCHEMA_VERSION,
    lote: lote.codigo,
    etapa: def.id,
    datos: r.datos,
    privado_commit: tienePrivado ? compromisoPrivado(lote.sal, def.id, r.privado!) : undefined,
  };
}

/** Equivale a `keccak256(abi.encode(loteId, uint8(etapa), dataHash, prevHash, fechaInicio, fechaFin, cantidadG))`. */
export function recordHashDe(
  loteId: Hex,
  indice: number,
  dataHash: Hex,
  prevHash: Hex,
  fechaInicio: bigint,
  fechaFin: bigint,
  cantidadG: bigint,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "uint8" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "uint64" },
        { type: "uint64" },
        { type: "uint64" },
      ],
      [loteId, indice, dataHash, prevHash, fechaInicio, fechaFin, cantidadG],
    ),
  );
}

export function construirPipeline(lote: LoteTrazable): PipelineCalculado {
  const loteId = loteIdDe(lote.tenant, lote.codigo);
  let prevHash: Hex = zeroHash;
  let anteriorCompletada = true;
  let fechaInicioPrevia = 0n;
  let ultimaCantidadG = 0n;

  const etapas = ETAPAS.map((def, indice): EtapaCalculada => {
    const registro = lote.etapas[def.id];
    if (!registro || registro.estado === "Pendiente") {
      anteriorCompletada = false;
      return { def, indice, estado: "Pendiente", registro, reglas: def.reglas.map((r) => ({ ...r })) };
    }

    const payload = payloadEtapa(lote, def, registro);
    const dataHash = hashJson(payload);
    const fechaInicio = unix(registro.fechaInicio);
    const fechaFin = unix(registro.fechaFin);
    const cantidadG = registro.cantidadKg !== undefined ? BigInt(Math.round(registro.cantidadKg * 1000)) : 0n;

    // Reglas que hace cumplir el contrato en registrarEtapa(), comunes a todas las etapas.
    const comunes: ResultadoRegla[] = [
      { texto: "Etapa anterior completada", donde: "contrato", ok: anteriorCompletada },
      {
        texto: "Fechas en orden respecto a la etapa anterior",
        donde: "contrato",
        ok: registro.fechaFin ? fechaFin >= fechaInicio && fechaInicio >= fechaInicioPrevia : undefined,
      },
    ];
    if (def.cantidad) {
      comunes.push({
        texto: "La cantidad no supera la de la etapa anterior",
        donde: "contrato",
        ok:
          registro.cantidadKg === undefined
            ? registro.estado === "Completada" ? false : undefined
            : cantidadG > 0n && (ultimaCantidadG === 0n || cantidadG <= ultimaCantidadG),
      });
    }
    const reglas = [...comunes, ...def.reglas.map((r) => ({ ...r, ok: r.cumple?.(registro) }))];

    const calculada: EtapaCalculada = {
      def,
      indice,
      estado: registro.estado,
      registro,
      payload,
      dataHash,
      prevHash,
      fechaInicio,
      fechaFin,
      cantidadG,
      reglas,
    };

    if (registro.estado === "Completada" && anteriorCompletada) {
      calculada.recordHash = recordHashDe(loteId, indice, dataHash, prevHash, fechaInicio, fechaFin, cantidadG);
      prevHash = calculada.recordHash;
      fechaInicioPrevia = fechaInicio;
      if (cantidadG > 0n) ultimaCantidadG = cantidadG;
    } else {
      anteriorCompletada = false;
    }
    return calculada;
  });

  return { loteId, tokenId: BigInt(loteId), etapas };
}
