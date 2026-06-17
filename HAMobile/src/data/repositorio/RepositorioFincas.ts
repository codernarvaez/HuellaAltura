import { eq } from 'drizzle-orm';
import { db } from '../local/database';
import { fincas } from '../local/esquema';

export class RepositorioFincas {
  constructor(private userId: string) {}

  /**
   * Obtiene todas las fincas vinculadas al usuario actual.
   */
  async obtenerTodas() {
    return await db().select()
      .from(fincas)
      .where(eq(fincas.productorId, this.userId));
  }

  /**
   * Obtiene una finca por ID.
   */
  async obtenerPorId(id: string) {
    const resultados = await db().select()
      .from(fincas)
      .where(eq(fincas.id, id));
    return resultados[0] || null;
  }
}
