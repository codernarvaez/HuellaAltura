import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { fincas } from './fincas';

/**
 * Tabla de Vértices de Polígono (RF-MOB-002)
 */
export const verticesPoligono = sqliteTable('vertices_poligono', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  fincaId: text('finca_id').notNull().references(() => fincas.id, { onDelete: 'cascade' }),
  latitud: real('latitud').notNull(),
  longitud: real('longitud').notNull(),
  ordenSecuencia: integer('orden_secuencia').notNull(),
  precisionMetros: real('precision_metros'),
});
