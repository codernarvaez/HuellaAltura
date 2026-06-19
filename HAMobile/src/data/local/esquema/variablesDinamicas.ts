import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const variablesDinamicas = sqliteTable('variables_dinamicas', {
  id: text('id').primaryKey(), // UUID local
  dato_id: text('dato_id').notNull(),
  
  nombre: text('nombre').notNull(),
  valor: text('valor').notNull(),
  tipo_dato: text('tipo_dato').notNull().default('STRING'), // STRING, NUMBER, BOOLEAN
  
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
