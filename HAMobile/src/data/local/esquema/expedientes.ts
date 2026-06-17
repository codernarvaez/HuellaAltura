import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const expedientes = sqliteTable('expedientes', {
  id: text('id').primaryKey(), // UUID v4 local
  fincaId: text('finca_id').notNull(),
  productorId: text('productor_id').notNull(),
  organizacionInquilino: text('organizacion_inquilino'),
  
  syncStatus: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
