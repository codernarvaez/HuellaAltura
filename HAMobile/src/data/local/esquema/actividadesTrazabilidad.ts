import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const actividadesTrazabilidad = sqliteTable('actividades_trazabilidad', {
  id: text('id').primaryKey(),
  numero: integer('numero'),
  etapa: text('etapa'),
  mes: text('mes'),
  actividad: text('actividad'),
  detalleTecnico: text('detalle_tecnico'),
  responsable: text('responsable'),
  jornalesHa: text('jornales_ha'),
  precioJornal: real('precio_jornal'),
  insumos: text('insumos'),
  cantidadHa: text('cantidad_ha'),
  unidad: text('unidad'),
  herramientas: text('herramientas'),
  datoCapturar: text('dato_capturar')
});
