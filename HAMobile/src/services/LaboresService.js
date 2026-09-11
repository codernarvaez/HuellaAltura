import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { eq } from 'drizzle-orm';
import { db } from '../data/local/database';
import { laboresLocales, ejecucionesLocales } from '../data/local/esquema';
import { endpoints } from '../api/endpoints';
import { obtenerToken } from './TokenService';

/**
 * Dominio de labores agrícolas offline-first (RF PPC-01…PPC-09, AGR-003).
 *
 * Con sesión real: el backend es la fuente de verdad y la copia local es un
 * espejo de lectura. Sin token (modo demostración u offline): todo se lee y
 * escribe en SQLite con sync_status 'pending'.
 *
 * TODO(C2): conectar las escrituras pendientes a la cola de sincronización
 * para reintentos automáticos al recuperar la conexión.
 */
export class LaboresService {
  /**
   * Devuelve la lista plana de labores de una finca (todas las del año).
   */
  static async getCalendario(fincaId) {
    const token = await obtenerToken();

    if (token) {
      try {
        const res = await fetch(endpoints.labores.calendario(fincaId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const remotas = [];
          if (json.calendario && Array.isArray(json.calendario)) {
            json.calendario.forEach((mesData) => {
              (mesData.labores || []).forEach((labor) => {
                remotas.push({
                  ...labor,
                  id: labor.labor_id || labor.id,
                  mes: mesData.mes,
                });
              });
            });
          } else if (Array.isArray(json)) {
            remotas.push(...json);
          }
          await this._espejarRemotas(fincaId, remotas);
          // Las creadas localmente sin sincronizar se muestran junto a las remotas
          const pendientes = await this._localesPendientes(fincaId);
          return [...remotas, ...pendientes];
        }
      } catch (e) {
        console.warn('[LaboresService] Red no disponible, usando copia local:', e.message);
      }
    }

    return this._todasLocales(fincaId);
  }

  static async agendar(fincaId, payload) {
    const token = await obtenerToken();

    if (token) {
      const res = await fetch(endpoints.labores.agendar, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, finca_id: fincaId }),
      });
      if (!res.ok) {
        const cuerpo = await res.text();
        throw new Error(this._detalleError(cuerpo, 'No se pudo agendar la labor.'));
      }
      return { origen: 'remoto' };
    }

    await db().insert(laboresLocales).values({
      id: Crypto.randomUUID(),
      finca_id: fincaId,
      nombre: payload.nombre,
      tipo_proceso: payload.tipo_proceso,
      mes: payload.mes,
      cantidad_proyectada: payload.cantidad_proyectada,
      estado: 'PLANIFICADO',
      origen: 'local',
      sync_status: 'pending',
      creado_en: new Date(),
    });
    return { origen: 'local' };
  }

  /**
   * Registra la ejecución de una labor. `evidencia` es opcional:
   * { fotoUri, latitud, longitud, watermark }.
   */
  static async ejecutar(labor, datos, evidencia) {
    const token = await obtenerToken();

    if (token) {
      let fotoUrl = null;
      let fotoHash = null;
      if (evidencia?.fotoUri) {
        const subida = await FileSystem.uploadAsync(endpoints.labores.subirEvidencia, evidencia.fotoUri, {
          fieldName: 'file',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType?.MULTIPART ?? 1,
          headers: { Authorization: `Bearer ${token}` },
          mimeType: 'image/jpeg',
        });
        if (subida.status < 200 || subida.status >= 300) {
          throw new Error('No se pudo subir la evidencia fotográfica al servidor.');
        }
        const cuerpo = JSON.parse(subida.body);
        fotoUrl = cuerpo.foto_url;
        fotoHash = cuerpo.foto_hash || null;
      }

      const res = await fetch(endpoints.labores.ejecutar(labor.id), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...datos,
          foto_url: fotoUrl,
          foto_hash: fotoHash,
          latitud: evidencia?.latitud ?? null,
          longitud: evidencia?.longitud ?? null,
          watermark_text: evidencia?.watermark ?? null,
        }),
      });
      if (!res.ok) {
        const cuerpo = await res.text();
        throw new Error(this._detalleError(cuerpo, 'No se pudo registrar la ejecución.'));
      }
      return { origen: 'remoto' };
    }

    // Offline/demo: la foto se conserva en el almacén de la app
    let fotoLocal = evidencia?.fotoUri || null;
    if (fotoLocal) {
      try {
        const destino = `${FileSystem.documentDirectory}evidencias/${Crypto.randomUUID()}.jpg`;
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}evidencias/`, { intermediates: true });
        await FileSystem.copyAsync({ from: fotoLocal, to: destino });
        fotoLocal = destino;
      } catch (e) {
        console.warn('[LaboresService] No se pudo copiar la evidencia, se usa la URI temporal:', e.message);
      }
    }

    const sqlite = db();
    await sqlite.insert(ejecucionesLocales).values({
      id: Crypto.randomUUID(),
      labor_id: labor.id,
      finca_id: labor.finca_id || labor.fincaId || datos.finca_id,
      persona_desarrollo: datos.persona_desarrollo,
      empleado_id: datos.empleado_id || null,
      nombre_jornalero: datos.nombre_jornalero || null,
      edad_jornalero: datos.edad_jornalero ?? null,
      dias_trabajo: datos.dias_trabajo ?? null,
      salario: datos.salario ?? null,
      detalle_aplicacion: datos.detalle_aplicacion || '',
      insumos_json: JSON.stringify(datos.insumos || []),
      herramientas_json: JSON.stringify(datos.herramientas || []),
      foto_uri: fotoLocal,
      foto_hash: null,
      latitud: evidencia?.latitud ?? null,
      longitud: evidencia?.longitud ?? null,
      watermark_text: evidencia?.watermark ?? null,
      sync_status: 'pending',
      creado_en: new Date(),
    });

    await sqlite
      .update(laboresLocales)
      .set({ estado: 'EJECUTADO' })
      .where(eq(laboresLocales.id, labor.id));

    return { origen: 'local' };
  }

  /**
   * Pre-validación normativa. Sin backend se simula el resultado para que el
   * flujo sea demostrable; el veredicto real lo da NormativaService (PPC-09).
   */
  static async validarNorma(laborId) {
    const token = await obtenerToken();

    if (token) {
      const res = await fetch(endpoints.labores.validarNorma(laborId), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('No se pudo validar la norma.');
      return res.json();
    }

    await db()
      .update(laboresLocales)
      .set({ estado: 'PRE_VALIDADO' })
      .where(eq(laboresLocales.id, laborId));

    return {
      estado_validacion: 'PRE_VALIDADO',
      detalles: {
        organico: { observacion: 'Sin insumos prohibidos detectados (validación local de demostración)' },
        comercio_justo: { observacion: 'Jornal y edad dentro de la normativa (validación local de demostración)' },
      },
    };
  }

  static async aprobar(laborId) {
    const token = await obtenerToken();

    if (token) {
      const res = await fetch(endpoints.labores.aprobar(laborId), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('No se pudo aprobar la labor.');
      return res.json();
    }

    await db()
      .update(laboresLocales)
      .set({ estado: 'AUDITADO' })
      .where(eq(laboresLocales.id, laborId));
    return { estado: 'AUDITADO' };
  }

  // --- helpers ---

  static async _todasLocales(fincaId) {
    const filas = await db()
      .select()
      .from(laboresLocales)
      .where(eq(laboresLocales.finca_id, fincaId));
    return filas;
  }

  static async _localesPendientes(fincaId) {
    const filas = await this._todasLocales(fincaId);
    return filas.filter((f) => f.origen === 'local' && f.sync_status === 'pending');
  }

  /**
   * Actualiza el espejo local con las labores del backend (solo lectura).
   */
  static async _espejarRemotas(fincaId, remotas) {
    try {
      const sqlite = db();
      for (const labor of remotas) {
        if (!labor.id) continue;
        const existente = await sqlite
          .select()
          .from(laboresLocales)
          .where(eq(laboresLocales.id, labor.id))
          .limit(1);
        const valores = {
          finca_id: fincaId,
          nombre: labor.nombre,
          tipo_proceso: labor.tipo_proceso || null,
          mes: labor.mes,
          cantidad_proyectada: labor.cantidad_proyectada || null,
          estado: labor.estado || 'PLANIFICADO',
          origen: 'remote',
          sync_status: 'synced',
        };
        if (existente.length > 0) {
          await sqlite.update(laboresLocales).set(valores).where(eq(laboresLocales.id, labor.id));
        } else {
          await sqlite.insert(laboresLocales).values({ id: labor.id, creado_en: new Date(), ...valores });
        }
      }
    } catch (e) {
      console.warn('[LaboresService] No se pudo espejar el calendario remoto:', e.message);
    }
  }

  static _detalleError(cuerpo, porDefecto) {
    try {
      const json = JSON.parse(cuerpo);
      if (typeof json.detail === 'string') return json.detail;
      if (Array.isArray(json.detail) && json.detail[0]?.msg) return json.detail[0].msg;
    } catch (e) {
      // cuerpo no era JSON
    }
    return porDefecto;
  }
}
