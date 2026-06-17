import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const productores = sqliteTable('productores', {
  id: text('id').primaryKey(), // UUID v4 local
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  cedulaId: text('cedula_id').notNull(),
  email: text('email'),
  phoneNumber: text('phone_number'),
  edad: integer('edad'),
  genero: text('genero'),
  organizacion: text('organizacion'),
  
  syncStatus: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
