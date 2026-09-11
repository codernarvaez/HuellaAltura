import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Copia local del calendario de labores (RF PPC-01/02) para trabajo
 * offline-first. `origen` distingue las labores creadas en el dispositivo
 * ('local', pendientes de subir) de las descargadas del backend ('remote').
 */
export const laboresLocales = sqliteTable('labores_locales', {
  id: text('id').primaryKey(),
  finca_id: text('finca_id').notNull(),
  nombre: text('nombre').notNull(),
  tipo_proceso: text('tipo_proceso'),
  mes: text('mes').notNull(),
  cantidad_proyectada: text('cantidad_proyectada'),
  estado: text('estado').notNull().default('PLANIFICADO'),
  origen: text('origen', { enum: ['local', 'remote'] }).notNull().default('local'),
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});

/**
 * Ejecuciones de labor registradas en el dispositivo (RF PPC-04/05/08).
 * Insumos y herramientas se serializan como JSON para mantener el paquete
 * atómico hasta su sincronización con POST /labores/{id}/ejecutar.
 */
export const ejecucionesLocales = sqliteTable('ejecuciones_locales', {
  id: text('id').primaryKey(),
  labor_id: text('labor_id').notNull(),
  finca_id: text('finca_id').notNull(),
  persona_desarrollo: text('persona_desarrollo').notNull(),
  empleado_id: text('empleado_id'),
  nombre_jornalero: text('nombre_jornalero'),
  edad_jornalero: integer('edad_jornalero'),
  dias_trabajo: real('dias_trabajo'),
  salario: real('salario'),
  detalle_aplicacion: text('detalle_aplicacion'),
  insumos_json: text('insumos_json').notNull().default('[]'),
  herramientas_json: text('herramientas_json').notNull().default('[]'),
  foto_uri: text('foto_uri'),
  foto_hash: text('foto_hash'),
  latitud: real('latitud'),
  longitud: real('longitud'),
  watermark_text: text('watermark_text'),
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
