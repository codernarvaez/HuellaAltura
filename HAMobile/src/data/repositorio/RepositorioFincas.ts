import { eq, and } from 'drizzle-orm';
import { db } from '../local/database';
import { fincas, verticesPoligono, colaSincronizacion } from '../local/esquema';
import * as Crypto from 'expo-crypto';

export class RepositorioFincas {
  constructor(private tenantId: string) {}

  /**
   * Crea una finca y sus vértices, registrando la operación en la cola de sincronización.
   * Patrón: Transactional Outbox
   */
  async crearConVertices(
    datosFinca: Omit<typeof fincas.$inferInsert, 'tenantId' | 'creadoEn' | 'actualizadoEn'>,
    vertices: Omit<typeof verticesPoligono.$inferInsert, 'id' | 'tenantId' | 'fincaId'>[]
  ) {
    const baseDatos = db();
    const ahora = new Date();

    return await baseDatos.transaction(async (tx: any) => {
      // 1. Insertar Finca
      const [nuevaFinca] = await tx.insert(fincas).values({
        ...datosFinca,
        tenantId: this.tenantId,
        creadoEn: ahora,
        actualizadoEn: ahora,
      }).returning();

      // 2. Insertar Vértices
      if (vertices.length > 0) {
        const verticesConIds = vertices.map((v, index) => ({
          ...v,
          id: Crypto.randomUUID(),
          fincaId: nuevaFinca.id,
          tenantId: this.tenantId,
          ordenSecuencia: index,
        }));
        await tx.insert(verticesPoligono).values(verticesConIds);
      }

      // 3. Registrar en Cola de Sincronización (Outbox)
      const payloadSincronizacion = {
        ...nuevaFinca,
        vertices: vertices,
      };

      await tx.insert(colaSincronizacion).values({
        id: Crypto.randomUUID(),
        tenantId: this.tenantId,
        nombreEntidad: 'fincas',
        idEntidad: nuevaFinca.id,
        operacion: 'INSERT',
        datos: payloadSincronizacion,
        estado: 'PENDIENTE',
        creadoEn: ahora,
      });

      return nuevaFinca;
    });
  }

  /**
   * Obtiene todas las fincas del inquilino actual.
   */
  async obtenerTodas() {
    return await db().select()
      .from(fincas)
      .where(eq(fincas.tenantId, this.tenantId));
  }

  /**
   * Obtiene una finca por ID, asegurando el aislamiento por tenant.
   */
  async obtenerPorId(id: string) {
    const resultados = await db().select()
      .from(fincas)
      .where(
        and(
          eq(fincas.id, id),
          eq(fincas.tenantId, this.tenantId)
        )
      );
    return resultados[0] || null;
  }
}
