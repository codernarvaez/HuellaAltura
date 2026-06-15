import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Tabla de Fincas (Fincas) - RF-MOB-002 / SRS 3.4.1
 */
export const fincas = sqliteTable('fincas', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  productorId: text('productor_id').notNull(),
  nombre: text('nombre').notNull(),
  
  // Geometría y Área (SRS 3.4.1)
  geometriaGeoJson: text('geometria_geojson', { mode: 'json' }).notNull(), 
  areaGeodesicaHectareas: real('area_geodesica_ha').notNull(),
  
  // Metadatos de Captura
  tipoCaptura: text('tipo_captura', { enum: ['GPS_CAMINATA', 'DIBUJO_MANUAL', 'PUNTO_BUFFER'] }).notNull(),
  precisionGpsMetros: real('precision_gps_metros'),
  
  // Flex-Core (RF-WEB-002)
  datosPersonalizados: text('datos_personalizados', { mode: 'json' }).notNull(), 
  
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});
