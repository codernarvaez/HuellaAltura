import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const productores = sqliteTable('productores', {
  id: text('id').primaryKey(), // UUID v4 local
  first_name: text('first_name').notNull(),
  last_name: text('last_name'),
  cedula_id: text('cedula_id').notNull(),
  email: text('email'),
  phone_number: text('phone_number'),
  edad: integer('edad'),
  genero: text('genero'),
  organizacion: text('organizacion'),
  
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
