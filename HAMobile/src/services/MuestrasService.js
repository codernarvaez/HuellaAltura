import * as Crypto from 'expo-crypto';
import { eq } from 'drizzle-orm';
import { db } from '../data/local/database';
import { muestrasLocales } from '../data/local/esquema';
import { endpoints } from '../api/endpoints';
import { obtenerToken } from './TokenService';

/**
 * Muestras de café en finca (Módulo 3, RF-APE-01/02).
 * Las reglas de peso son un espejo exacto de app/schemas/acopio.py del
 * backend: 0,5 kg para Lavado y Honey, 1 kg para Natural, ±10 % de báscula.
 */
export const LB_A_KG = 0.453592;
export const TOLERANCIA_PESO = 0.10;
export const PESO_MUESTRA_KG = {
  Lavado: 0.5,
  Honey: 0.5,
  Natural: 1.0,
};
export const TIPOS_PROCESO = Object.keys(PESO_MUESTRA_KG);

/**
 * Devuelve null si el peso es válido, o el mensaje de error.
 */
export const validarPesoMuestra = (tipoProceso, pesoLb) => {
  const esperadoKg = PESO_MUESTRA_KG[tipoProceso];
  if (!esperadoKg) return 'Seleccione el tipo de proceso de la muestra.';

  const peso = parseFloat(String(pesoLb).replace(',', '.'));
  if (!Number.isFinite(peso) || peso <= 0) {
    return 'Ingrese el peso de la muestra en libras.';
  }

  const pesoKg = peso * LB_A_KG;
  if (Math.abs(pesoKg - esperadoKg) > esperadoKg * TOLERANCIA_PESO) {
    const esperadoLb = (esperadoKg / LB_A_KG).toFixed(2);
    return (
      `El proceso ${tipoProceso} requiere una muestra de ${esperadoKg} kg ` +
      `(≈ ${esperadoLb} lb) con ±10 % de tolerancia. Peso recibido: ${pesoKg.toFixed(2)} kg.`
    );
  }
  return null;
};

export class MuestrasService {
  static async listar() {
    const filas = await db().select().from(muestrasLocales);
    return filas.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
  }

  /**
   * Registra una muestra: en el backend si hay sesión real, localmente si no.
   * Devuelve { origen } o lanza Error con el detalle.
   */
  static async registrar(finca, datos) {
    const errorPeso = validarPesoMuestra(datos.tipoProceso, datos.peso_lb);
    if (errorPeso) throw new Error(errorPeso);

    const token = await obtenerToken();
    const peso = parseFloat(String(datos.peso_lb).replace(',', '.'));

    if (token) {
      const res = await fetch(endpoints.acopio.muestras, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fincaId: finca.id,
          productorId: datos.productorId || finca.productor_id || finca.usuario_id,
          codigoQR: `HA-MUESTRA-${Crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          tipoProceso: datos.tipoProceso,
          peso_lb: peso,
          evidenciaFoto: datos.evidenciaFoto || null,
        }),
      });
      if (!res.ok) {
        let detalle = 'No se pudo registrar la muestra en el servidor.';
        try {
          const json = await res.json();
          if (typeof json.detail === 'string') detalle = json.detail;
          else if (Array.isArray(json.detail) && json.detail[0]?.msg) detalle = json.detail[0].msg;
        } catch (e) { /* cuerpo no era JSON */ }
        throw new Error(detalle);
      }

      // Espejo local ya sincronizado, para que el historial del dispositivo
      // refleje también lo enviado al servidor.
      try {
        await db().insert(muestrasLocales).values({
          id: Crypto.randomUUID(),
          finca_id: finca.id,
          finca_nombre: finca.nombre || null,
          tipo_proceso: datos.tipoProceso,
          peso_lb: peso,
          observaciones: datos.observaciones || null,
          latitud: datos.latitud ?? null,
          longitud: datos.longitud ?? null,
          sync_status: 'synced',
          creado_en: new Date(),
        });
      } catch (e) {
        console.warn('[MuestrasService] No se pudo espejar la muestra localmente:', e.message);
      }
      return { origen: 'remoto' };
    }

    await db().insert(muestrasLocales).values({
      id: Crypto.randomUUID(),
      finca_id: finca.id,
      finca_nombre: finca.nombre || null,
      tipo_proceso: datos.tipoProceso,
      peso_lb: peso,
      observaciones: datos.observaciones || null,
      latitud: datos.latitud ?? null,
      longitud: datos.longitud ?? null,
      sync_status: 'pending',
      creado_en: new Date(),
    });
    return { origen: 'local' };
  }

  static async eliminar(muestraId) {
    await db().delete(muestrasLocales).where(eq(muestrasLocales.id, muestraId));
  }
}
