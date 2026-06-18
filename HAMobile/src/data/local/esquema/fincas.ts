import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Tabla de Fincas (Fincas) - RF-MOB-002 / SRS 3.4.1
 * Actualizada para soportar sincronización offline masiva.
 */
export const fincas = sqliteTable('fincas', {
  id: text('id').primaryKey(), // UUID v4 generado localmente
  nombre: text('nombre').notNull(),
  productor_id: text('productor_id'), // Puede ser nulo si el productor se crea en el mismo paquete
  
  // Geografía
  provincia: text('provincia').notNull(),
  canton: text('canton'),
  parroquia: text('parroquia'),
  barrio_sector: text('barrio_sector'),
  
  // Áreas
  area_total_ha: real('area_total_ha').notNull(),
  area_cultivada_ha: real('area_cultivada_ha'),
  tenencia: text('tenencia'),
  
  // Geometría
  geometria_geojson: text('geometria_geojson').notNull(), 
  latitud_centro: real('latitud_centro'),
  longitud_centro: real('longitud_centro'),
  
  // Sincronización
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
