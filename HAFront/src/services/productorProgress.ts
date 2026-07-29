// src/services/productorProgress.ts
//
// Calcula el progreso secuencial del flujo del PRODUCTOR:
//   1. Productor y Finca
//   2. Información Agroambiental
//   3. Satelital
//   4. Expediente
//
// Se usa tanto en `src/middleware.ts` (para bloquear el acceso directo por URL)
// como en `LayoutVariable.astro` (para bloquear visualmente el sidebar), de modo
// que ambos compartan exactamente la misma fuente de verdad.

import { FincaService } from "./finca.service";
import { AgroambientalService } from "./InfoAgroambiental";
import { ExpedienteService } from "./expediente.service";
// ⚠️ AJUSTAR: importa aquí el servicio real que confirma que la etapa
// satelital fue completada para la finca, por ejemplo:
// import { SatelitalService } from "./satelital.service";

export const STEP_ORDER = ["finca", "agroambiental", "satelital", "expediente"] as const;
export type StepKey = (typeof STEP_ORDER)[number];

export interface ProductorProgress {
  finca: boolean;
  fincaId: string | null;
  agroambiental: boolean;
  satelital: boolean;
  expediente: boolean;
}

const STEP_LABELS: Record<StepKey, string> = {
  finca: "Productor y Finca",
  agroambiental: "Información Agroambiental",
  satelital: "Satelital",
  expediente: "Expediente",
};

export function labelForStep(step: StepKey): string {
  return STEP_LABELS[step];
}

/** Construye la URL de destino de un paso, incluyendo finca_id si está disponible. */
export function urlForStep(step: StepKey, fincaId?: string | null): string {
  switch (step) {
    case "finca":
      return "/productorFinca";
    case "agroambiental":
      return fincaId ? `/infoAgro?finca_id=${fincaId}` : "/infoAgro";
    case "satelital":
      return fincaId ? `/satelital?finca_id=${fincaId}` : "/satelital";
    case "expediente":
      return fincaId ? `/expedientes?finca_id=${fincaId}` : "/expedientes";
  }
}

/**
 * Calcula qué pasos ha completado el productor.
 * Cada paso solo se consulta si el anterior existe (para no hacer llamadas
 * innecesarias), pero el resultado siempre trae los 4 flags.
 */
export async function getProductorProgress(
  userId: string,
  token: string
): Promise<ProductorProgress> {
  const state: ProductorProgress = {
    finca: false,
    fincaId: null,
    agroambiental: false,
    satelital: false,
    expediente: false,
  };

  // ---- Paso 1: Productor y Finca ----
  try {
    const fincas = await FincaService.getByUsuarioId(userId, token);
    console.log("🔎 [progreso-productor] Respuesta cruda de FincaService.getByUsuarioId:", fincas);

    const finca = Array.isArray(fincas) ? fincas[0] : fincas;
    state.finca = !!finca && typeof finca === "object" && Object.keys(finca).length > 0;
    if (state.finca) state.fincaId = finca.id ?? null;

    console.log(`🔎 [progreso-productor] finca=${state.finca} fincaId=${state.fincaId}`);
  } catch (e) {
    console.warn("⚠️ [progreso-productor] Error obteniendo finca:", e);
  }

  if (state.finca && state.fincaId) {
    // ---- Paso 2: Información Agroambiental ----
    try {
      const registros = await AgroambientalService.getByFinca(state.fincaId, token);
      console.log("🔎 [progreso-productor] Respuesta cruda de AgroambientalService.getByFinca:", registros);

      state.agroambiental = Array.isArray(registros) && registros.length > 0;
      console.log(`🔎 [progreso-productor] agroambiental=${state.agroambiental} (registros=${Array.isArray(registros) ? registros.length : "no-array"})`);
    } catch (e) {
      console.warn("⚠️ [progreso-productor] Error obteniendo info agroambiental:", e);
    }

    // ---- Paso 3: Satelital ----
    try {
      // ⚠️ AJUSTAR: reemplaza esta línea por la llamada real, por ejemplo:
      //   const satelital = await SatelitalService.getByFinca(state.fincaId, token);
      //   state.satelital = Array.isArray(satelital) ? satelital.length > 0 : !!satelital;
      //
      // Mientras no exista el servicio real dejamos este paso DESBLOQUEADO
      // (fail-open) para no dejar productores atrapados por un chequeo mal hecho.
      state.satelital = true;
    } catch (e) {
      console.warn("⚠️ [progreso-productor] Error obteniendo estado satelital:", e);
    }
  } else {
    console.log("🔎 [progreso-productor] Se omiten los pasos 2 y 3 porque state.finca o state.fincaId son falsy");
  }

  // ---- Paso 4: Expediente ----
  if (state.finca) {
    try {
      const expedientes = await ExpedienteService.list(token, { productor_id: userId });
      state.expediente = Array.isArray(expedientes) && expedientes.length > 0;
    } catch (e) {
      console.warn("⚠️ [progreso-productor] Error obteniendo expedientes:", e);
    }
  }

  console.log("✅ [progreso-productor] Estado final:", state);

  return state;
}

/** True si todos los pasos ANTERIORES a `step` están completos. */
export function pasosPreviosCompletos(step: StepKey, progress: ProductorProgress): boolean {
  const idx = STEP_ORDER.indexOf(step);
  for (let i = 0; i < idx; i++) {
    if (!progress[STEP_ORDER[i]]) return false;
  }
  return true;
}

/** Devuelve el primer paso incompleto, o null si el productor ya completó todo. */
export function primerPasoIncompleto(progress: ProductorProgress): StepKey | null {
  for (const step of STEP_ORDER) {
    if (!progress[step]) return step;
  }
  return null;
}