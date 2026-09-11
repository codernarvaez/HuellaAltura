import * as Crypto from 'expo-crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '../data/local/database';
import { empleados } from '../data/local/esquema';

export const EDAD_MINIMA_EMPLEADO = 18;

/**
 * Catálogo local de empleados/jornaleros (RF PPC-04/05).
 *
 * Vive en SQLite: el productor gestiona su cuadrilla desde el dispositivo y
 * cada ejecución de labor referencia al empleado seleccionado. El backend
 * recibe nombre y edad dentro de la ejecución; un catálogo servidor-side de
 * trabajadores queda como implementación posterior (Track D2).
 */
export class EmpleadosService {
  static async listar(productorId, { incluirInactivos = false } = {}) {
    const sqlite = db();
    const filas = await sqlite
      .select()
      .from(empleados)
      .where(
        incluirInactivos
          ? eq(empleados.productor_id, productorId)
          : and(eq(empleados.productor_id, productorId), eq(empleados.activo, 1))
      );
    return filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /**
   * Valida y crea un empleado. Devuelve { empleado } o { error }.
   */
  static async crear(productorId, datos) {
    const nombre = (datos.nombre || '').trim();
    if (nombre.length < 3) {
      return { error: 'Ingrese el nombre completo del empleado.' };
    }

    const edad = parseInt(datos.edad, 10);
    if (!Number.isFinite(edad) || edad <= 0) {
      return { error: 'Ingrese la edad del empleado.' };
    }
    if (edad < EDAD_MINIMA_EMPLEADO) {
      return {
        error:
          `No se puede registrar: el empleado debe tener al menos ${EDAD_MINIMA_EMPLEADO} años. ` +
          'El trabajo infantil está prohibido por la normativa de Comercio Justo.',
      };
    }

    const salario = datos.salario_jornal !== undefined && datos.salario_jornal !== ''
      ? parseFloat(String(datos.salario_jornal).replace(',', '.'))
      : null;
    if (salario !== null && (!Number.isFinite(salario) || salario < 0)) {
      return { error: 'El salario por jornal debe ser un número válido.' };
    }

    const empleado = {
      id: Crypto.randomUUID(),
      productor_id: productorId,
      nombre,
      cedula: (datos.cedula || '').trim() || null,
      edad,
      telefono: (datos.telefono || '').trim() || null,
      salario_jornal: salario,
      activo: 1,
      sync_status: 'pending',
      creado_en: new Date(),
    };

    await db().insert(empleados).values(empleado);
    return { empleado };
  }

  /**
   * Baja lógica: se conserva el histórico porque las ejecuciones pasadas
   * referencian al empleado.
   */
  static async desactivar(empleadoId) {
    await db().update(empleados).set({ activo: 0 }).where(eq(empleados.id, empleadoId));
  }

  static async reactivar(empleadoId) {
    await db().update(empleados).set({ activo: 1 }).where(eq(empleados.id, empleadoId));
  }
}
