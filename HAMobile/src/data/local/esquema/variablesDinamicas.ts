import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const variablesDinamicas = sqliteTable('variables_dinamicas', {
  id: text('id').primaryKey(), // UUID v4 local
  datoId: text('dato_id').notNull(), // FK a datosAgroambientales.id
  
  nombre: text('nombre').notNull(),
  valor: text('valor').notNull(),
  tipoDato: text('tipo_dato').notNull().default('texto'),
  
  syncStatus: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
