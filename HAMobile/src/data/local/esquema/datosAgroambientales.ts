import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const datosAgroambientales = sqliteTable('datos_agroambientales', {
  id: text('id').primaryKey(), // UUID v4 local
  expediente_id: text('expediente_id').notNull(),
  
  indice_shannon: real('indice_shannon'),
  indice_simpson: real('indice_simpson'),
  uso_suelo: text('uso_suelo'),
  cobertura_forestal: text('cobertura_forestal'), // Guardado como string (JSON.stringify o comma separated)
  sistema_produccion: text('sistema_produccion'),
  
  // Nuevos campos según requerimiento
  biomasa_arboles: real('biomasa_arboles'),
  biomasa_cafe: real('biomasa_cafe'),
  hojarasca_mantillo: real('hojarasca_mantillo'),
  carbono_organico_suelo: real('carbono_organico_suelo'),
  total_stock_carbono: real('total_stock_carbono'),
  
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
