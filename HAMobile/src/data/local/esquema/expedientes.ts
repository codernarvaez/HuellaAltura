import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const expedientes = sqliteTable('expedientes', {
  id: text('id').primaryKey(),
  finca_id: text('finca_id').notNull(),
  productor_id: text('productor_id').notNull(),
  organizacion_inquilino: text('organizacion_inquilino'),
  
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
