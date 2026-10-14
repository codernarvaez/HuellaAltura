/** Códigos alineados con HAFront infoAgro / exped-service. */

export const USO_SUELO_OPTIONS = [
  { value: 'AGRICOLA', label: 'Agrícola' },
  { value: 'FORESTAL', label: 'Forestal' },
  { value: 'PASTOREO', label: 'Pastoreo' },
  { value: 'MIXTO', label: 'Mixto' },
  { value: 'CONSERVACION', label: 'Conservación' },
  { value: 'OTRO', label: 'Otro' },
];

export const COBERTURA_FORESTAL_OPTIONS = [
  { value: 'BOSQUE_NATIVO', label: 'Bosque Nativo' },
  { value: 'BOSQUE_PLANTADO', label: 'Bosque Plantado' },
  { value: 'PASTIZAL', label: 'Pastizal' },
  { value: 'CULTIVOS', label: 'Cultivos' },
  { value: 'VEGETACION_SECUNDARIA', label: 'Vegetación Secundaria' },
  { value: 'OTRO', label: 'Otro' },
];

export const SISTEMA_PRODUCCION_OPTIONS = [
  { value: 'ORGANICO', label: 'Orgánico' },
  { value: 'CONVENCIONAL', label: 'Convencional' },
  { value: 'AGROFORESTAL', label: 'Agroforestal' },
  { value: 'SILVOPASTORIL', label: 'Silvopastoril' },
  { value: 'TRADICIONAL', label: 'Tradicional' },
  { value: 'OTRO', label: 'Otro' },
];

function normalizeCode(raw, options, fallback) {
  if (raw == null || raw === '') return fallback;
  const s = String(raw).trim();
  const upper = s.toUpperCase().replace(/\s+/g, '_');
  if (options.some((o) => o.value === upper)) return upper;

  const lower = s.toLowerCase();
  const byLabel = options.find((o) => o.label.toLowerCase() === lower);
  if (byLabel) return byLabel.value;

  // Texto libre histórico del seed/demo
  if (/agr[ií]cola|agroforest|cultivo|caf[eé]/i.test(lower)) {
    if (options === USO_SUELO_OPTIONS) return 'AGRICOLA';
    if (options === COBERTURA_FORESTAL_OPTIONS) return 'CULTIVOS';
    if (options === SISTEMA_PRODUCCION_OPTIONS) {
      if (/org[aá]nico/.test(lower)) return 'ORGANICO';
      return 'AGROFORESTAL';
    }
  }
  if (/org[aá]nico/.test(lower) && options === SISTEMA_PRODUCCION_OPTIONS) {
    return 'ORGANICO';
  }

  return fallback;
}

export function toUsoSueloCode(raw) {
  return normalizeCode(raw, USO_SUELO_OPTIONS, 'AGRICOLA');
}

export function toCoberturaCode(raw) {
  // Puede venir como JSON array de tags legacy
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        return normalizeCode(arr.join(' '), COBERTURA_FORESTAL_OPTIONS, 'CULTIVOS');
      }
    } catch {
      /* ignore */
    }
  }
  return normalizeCode(raw, COBERTURA_FORESTAL_OPTIONS, 'CULTIVOS');
}

export function toSistemaCode(raw) {
  return normalizeCode(raw, SISTEMA_PRODUCCION_OPTIONS, 'AGROFORESTAL');
}
