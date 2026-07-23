import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Catálogo local de empleados/jornaleros del productor (RF PPC-04 / PPC-05).
 * Permite seleccionar o crear trabajadores al ejecutar una labor sin
 * reescribir sus datos cada vez. La edad se valida ≥ 18 en la capa de UI
 * y en el backend (prohibición de trabajo infantil, requisito crítico).
 */
export const empleados = sqliteTable('empleados', {
  id: text('id').primaryKey(),
  productor_id: text('productor_id'),
  nombre: text('nombre').notNull(),
  cedula: text('cedula'),
  edad: integer('edad').notNull(),
  telefono: text('telefono'),
  salario_jornal: real('salario_jornal'),
  activo: integer('activo').notNull().default(1),
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
