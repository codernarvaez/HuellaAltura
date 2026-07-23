import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Expediente documental capturado en campo (M1 RF-07/08/10).
 * El archivo (PDF o fotografía) se copia al almacenamiento de la app y aquí
 * se guarda su metadata + hash SHA-256 para integridad.
 *
 * La subida al object storage privado del backend queda pendiente del
 * Track A4: mientras tanto los documentos permanecen con sync_status
 * 'pending' y el prototipo demuestra el flujo completo de captura.
 */
export const documentosFinca = sqliteTable('documentos_finca', {
  id: text('id').primaryKey(),
  finca_id: text('finca_id'),
  productor_id: text('productor_id'),
  // CEDULA | RUC | ESCRITURA | CERTIFICADO_POSESION | CERTIFICADO_ORGANICO | OTRO
  tipo_documento: text('tipo_documento').notNull(),
  nombre_archivo: text('nombre_archivo').notNull(),
  uri_local: text('uri_local').notNull(),
  mime: text('mime').notNull(),
  tamano_bytes: integer('tamano_bytes'),
  hash_sha256: text('hash_sha256'),
  sync_status: text('sync_status', { enum: ['pending', 'synced'] }).notNull().default('pending'),
  creado_en: integer('creado_en', { mode: 'timestamp' }).notNull(),
});
