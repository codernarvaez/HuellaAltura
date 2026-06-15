import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Cola de Sincronización - RS-SEC-002
 */
export const colaSincronizacion = sqliteTable('cola_sincronizacion', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  
  nombreEntidad: text('nombre_entidad').notNull(), 
  idEntidad: text('id_entidad').notNull(),     
  operacion: text('operacion', { enum: ['INSERT', 'UPDATE', 'DELETE'] }).notNull(),
  
  datos: text('datos', { mode: 'json' }).notNull(), 
  
  estado: text('estado', { enum: ['PENDIENTE', 'PROCESANDO', 'FALLIDO', 'COMPLETADO'] }).notNull().default('PENDIENTE'),
  
  conteoReintentos: integer('conteo_reintentos').notNull().default(0),
  ultimoError: text('ultimo_error'),
  
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  procesadoEn: integer('procesado_en', { mode: 'timestamp' }),
});
