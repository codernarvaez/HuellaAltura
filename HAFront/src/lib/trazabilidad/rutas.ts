// Catálogo de las vistas del módulo de trazabilidad (V1-V8) y sus rutas.
// Es la única fuente de rutas del módulo: el menú, las páginas y los enlaces
// entre vistas la usan en lugar de escribir las URL a mano.

export const BASE_TRAZABILIDAD = "/trazabilidad";

export type IdVista = "V1" | "V2" | "V3" | "V4" | "V5" | "V6" | "V7" | "V8";

export type FaseLote = "beneficio" | "secado" | "trilla" | "cata";

export const FASES_LOTE: readonly FaseLote[] = ["beneficio", "secado", "trilla", "cata"];

export interface Vista {
  id: IdVista;
  titulo: string;
  /** Una línea para la cabecera de la vista. */
  descripcion: string;
  /** "modulo": se abre desde las pestañas; "lote": necesita el id de un lote. */
  alcance: "modulo" | "lote";
  /** Último segmento de la ruta ("cosecha", "secado"…); null para V1 y V3. */
  segmento: string | null;
  hu: string;
  /** Tarea del tablero que completa la vista. */
  tarea: string;
  /** Icono de Material Symbols. */
  icono: string;
}

export const VISTAS: readonly Vista[] = [
  {
    id: "V1",
    titulo: "Panel de lotes",
    descripcion: "Qué lotes hay, en qué estado están y qué le toca hacer a tu rol.",
    alcance: "modulo",
    segmento: null,
    hu: "Todas",
    tarea: "T07",
    icono: "inventory_2",
  },
  {
    id: "V2",
    titulo: "Registrar cosecha",
    descripcion: "Crea el lote de café cereza y su token a partir de una finca con DDS vigente.",
    alcance: "modulo",
    segmento: "cosecha",
    hu: "HU-02",
    tarea: "T09",
    icono: "agriculture",
  },
  {
    id: "V3",
    titulo: "Ficha del lote",
    descripcion: "Fases, línea de tiempo, linaje y custodios del lote.",
    alcance: "lote",
    segmento: null,
    hu: "HU-06, HU-07",
    tarea: "T08",
    icono: "description",
  },
  {
    id: "V4",
    titulo: "Beneficio húmedo",
    descripcion: "Registra la fermentación y el lavado del lote.",
    alcance: "lote",
    segmento: "beneficio",
    hu: "HU-03",
    tarea: "T11",
    icono: "water_drop",
  },
  {
    id: "V5",
    titulo: "Secado",
    descripcion: "Registra el método de secado y la humedad final del lote.",
    alcance: "lote",
    segmento: "secado",
    hu: "HU-04",
    tarea: "T12",
    icono: "wb_sunny",
  },
  {
    id: "V6",
    titulo: "Trilla",
    descripcion: "Registra el paso de pergamino a café verde y el factor de rendimiento.",
    alcance: "lote",
    segmento: "trilla",
    hu: "Extra",
    tarea: "T13",
    icono: "grain",
  },
  {
    id: "V7",
    titulo: "Cata SCA",
    descripcion: "Registra el puntaje SCA, los defectos y el perfil sensorial del lote.",
    alcance: "lote",
    segmento: "cata",
    hu: "HU-05",
    tarea: "T16",
    icono: "local_cafe",
  },
  {
    id: "V8",
    titulo: "Empaque y exportación",
    descripcion: "Divide en sacos, mezcla lotes y marca la exportación.",
    alcance: "modulo",
    segmento: "empaque",
    hu: "HU-06",
    tarea: "T18",
    icono: "local_shipping",
  },
];

// El id de lote es el tokenId ERC-1155 del CoffeeToken (uint256), en decimal,
// sin ceros a la izquierda y desde 1.
const LOTE_ID = /^[1-9][0-9]{0,77}$/;
const MAX_UINT256 = (1n << 256n) - 1n;

export function esLoteIdValido(id: string | undefined): boolean {
  if (id === undefined || !LOTE_ID.test(id)) return false;
  return BigInt(id) <= MAX_UINT256;
}

export function esFaseLote(valor: string | undefined): valor is FaseLote {
  return (FASES_LOTE as readonly (string | undefined)[]).includes(valor);
}

export function obtenerVista(id: IdVista): Vista {
  const vista = VISTAS.find((v) => v.id === id);
  if (!vista) throw new Error(`Vista desconocida: ${id}`);
  return vista;
}

/** Ruta navegable de una vista. Las vistas de lote exigen un id válido. */
export function rutaVista(id: IdVista, loteId?: string): string {
  const vista = obtenerVista(id);

  if (vista.alcance === "modulo") {
    return vista.segmento ? `${BASE_TRAZABILIDAD}/${vista.segmento}` : BASE_TRAZABILIDAD;
  }

  if (!esLoteIdValido(loteId)) {
    throw new Error(`La vista ${id} necesita un id de lote válido`);
  }
  const ficha = `${BASE_TRAZABILIDAD}/lotes/${loteId}`;
  return vista.segmento ? `${ficha}/${vista.segmento}` : ficha;
}

/** Vista que atiende una ruta, o null si la ruta no es del módulo. */
export function vistaDesdeRuta(pathname: string): { vista: Vista; loteId?: string } | null {
  const ruta = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (ruta === BASE_TRAZABILIDAD) return { vista: obtenerVista("V1") };
  if (!ruta.startsWith(`${BASE_TRAZABILIDAD}/`)) return null;

  const segmentos = ruta.slice(BASE_TRAZABILIDAD.length + 1).split("/");

  if (segmentos.length === 1) {
    const vista = VISTAS.find((v) => v.alcance === "modulo" && v.segmento === segmentos[0]);
    return vista ? { vista } : null;
  }

  const [lotes, loteId, fase] = segmentos;
  if (lotes !== "lotes" || !esLoteIdValido(loteId) || segmentos.length > 3) return null;
  if (fase === undefined) return { vista: obtenerVista("V3"), loteId };

  const vista = VISTAS.find((v) => v.alcance === "lote" && v.segmento === fase);
  return vista ? { vista, loteId } : null;
}

export interface Miga {
  etiqueta: string;
  /** Ausente en el último elemento (la página actual). */
  href?: string;
}

/** Migas de pan de una ruta del módulo; vacías si la ruta no es del módulo. */
export function migasDePan(pathname: string): Miga[] {
  const encontrada = vistaDesdeRuta(pathname);
  if (!encontrada) return [];

  const { vista, loteId } = encontrada;
  const migas: Miga[] = [{ etiqueta: "Trazabilidad", href: BASE_TRAZABILIDAD }];

  if (vista.alcance === "modulo") {
    migas.push({ etiqueta: vista.titulo });
  } else if (vista.id === "V3") {
    migas.push({ etiqueta: `Lote ${loteId}` });
  } else {
    migas.push({ etiqueta: `Lote ${loteId}`, href: rutaVista("V3", loteId) });
    migas.push({ etiqueta: vista.titulo });
  }

  return migas;
}
