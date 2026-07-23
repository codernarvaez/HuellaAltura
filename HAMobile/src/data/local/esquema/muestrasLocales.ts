import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Muestras de café tomadas en finca por el técnico de campo
 * (Módulo 3, RF-APE-01/02). Se validan localmente con las mismas reglas
 * del backend (0,5 kg Lavado/Honey, 1 kg Natural, ±10 %) y se sincronizan
 * con POST /acopio/muestras/ cuando hay conexión.
 */
export const muestrasLocales = sqliteTable('muestras_locales', {
  id: text('id').primaryKey(),
  finca_id: text('finca_id').notNull(),
  finca_nombre: text('finca_nombre'),
  tipo_proceso: text('tipo_proceso').notNull(), // Lavado | Honey | Natural
  peso_lb: real('peso_lb').notNull(),
  observaciones: text('observaciones'),
  latitud: real('latitud'),
  longitud: real('longitud'),
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
