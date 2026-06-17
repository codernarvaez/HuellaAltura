import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Tabla de Fincas (Fincas) - RF-MOB-002 / SRS 3.4.1
 * Actualizada para soportar sincronización offline masiva.
 */
export const fincas = sqliteTable('fincas', {
  id: text('id').primaryKey(), // UUID v4 generado localmente
  nombre: text('nombre').notNull(),
  productorId: text('productor_id'), // Puede ser nulo si el productor se crea en el mismo paquete
  
  // Geografía
  provincia: text('provincia').notNull(),
  canton: text('canton'),
  parroquia: text('parroquia'),
  barrioSector: text('barrio_sector'),
  
  // Áreas
  areaTotalHa: real('area_total_ha').notNull(),
  areaCultivoHa: real('area_cultivo_ha'),
  tenenciaTierra: text('tenencia_tierra'),
  
  // Geometría
  geometriaGeoJson: text('geometria_geojson').notNull(), 
  latitudCentro: real('latitud_centro'),
  longitudCentro: real('longitud_centro'),
  
  // Sincronización
  syncStatus: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
