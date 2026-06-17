import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const datosAgroambientales = sqliteTable('datos_agroambientales', {
  id: text('id').primaryKey(), // UUID v4 local
  expedienteId: text('expediente_id').notNull(),
  
  indiceShannon: real('indice_shannon'),
  indiceSimpson: real('indice_simpson'),
  usoSuelo: text('uso_suelo'),
  coberturaForestal: text('cobertura_forestal'), // Guardado como string (JSON.stringify o comma separated)
  sistemaProduccion: text('sistema_produccion'),
  
  biomasaAereaTcHa: real('biomasa_aerea_tc_ha'),
  cosTcHa: real('cos_tc_ha'),
  totalStockCarbono: real('total_stock_carbono'),
  
  syncStatus: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
