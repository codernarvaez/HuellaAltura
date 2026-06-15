import { eq, asc, and } from 'drizzle-orm';
import { db } from '../local/database';
import { colaSincronizacion } from '../local/esquema';

export class RepositorioColaSincronizacion {
  constructor(private tenantId: string) {}

  /**
   * Obtiene los elementos pendientes de sincronización ordenados por fecha (FIFO).
   */
  async obtenerElementosPendientes(limite = 10) {
    return await db().select()
      .from(colaSincronizacion)
      .where(
        and(
          eq(colaSincronizacion.tenantId, this.tenantId),
          eq(colaSincronizacion.estado, 'PENDIENTE')
        )
      )
      .orderBy(asc(colaSincronizacion.creadoEn))
      .limit(limite);
  }

  /**
   * Actualiza el estado de un elemento en la cola.
   */
  async actualizarEstado(id: string, estado: 'PROCESANDO' | 'FALLIDO' | 'COMPLETADO', error?: string) {
    return await db().update(colaSincronizacion)
      .set({ 
        estado, 
        ultimoError: error || null,
        procesadoEn: estado === 'COMPLETADO' ? new Date() : null,
        conteoReintentos: estado === 'FALLIDO' ? (item) => item.conteoReintentos + 1 : undefined
      })
      .where(eq(colaSincronizacion.id, id));
  }
}
