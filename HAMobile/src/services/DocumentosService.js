import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { eq } from 'drizzle-orm';
import { db } from '../data/local/database';
import { documentosFinca } from '../data/local/esquema';

/**
 * Expediente documental del registro de finca (M1 RF-07/08/10).
 *
 * Los archivos (PDF o fotografía) se copian al almacenamiento privado de la
 * app y se registra su hash SHA-256 para integridad. La subida al object
 * storage del backend queda como implementación posterior (Track A4): el
 * documento permanece 'pending' y este servicio es el único punto que habrá
 * que conectar cuando el bucket privado esté disponible.
 */

export const TIPOS_DOCUMENTO = [
  { clave: 'CEDULA', etiqueta: 'Cédula de identidad', obligatorio: true },
  { clave: 'ESCRITURA', etiqueta: 'Escritura o certificado de posesión', obligatorio: true },
  { clave: 'CERTIFICADO_ORGANICO', etiqueta: 'Certificado orgánico', obligatorio: false },
  { clave: 'OTRO', etiqueta: 'Otro documento de soporte', obligatorio: false },
];

const DIR_DOCUMENTOS = () => `${FileSystem.documentDirectory}documentos/`;

export class DocumentosService {
  /**
   * Copia el archivo seleccionado al almacén de la app, calcula su hash y lo
   * registra. `archivo`: { uri, name, mimeType, size }.
   * Devuelve el documento insertado.
   */
  static async adjuntar({ productorId, fincaId = null, tipoDocumento, archivo }) {
    const id = Crypto.randomUUID();
    const extension = archivo.name?.includes('.')
      ? archivo.name.substring(archivo.name.lastIndexOf('.'))
      : archivo.mimeType === 'application/pdf' ? '.pdf' : '.jpg';
    const destino = `${DIR_DOCUMENTOS()}${id}${extension}`;

    await FileSystem.makeDirectoryAsync(DIR_DOCUMENTOS(), { intermediates: true });
    await FileSystem.copyAsync({ from: archivo.uri, to: destino });

    // Hash de integridad sobre el contenido (base64 → SHA-256)
    let hash = null;
    try {
      const base64 = await FileSystem.readAsStringAsync(destino, { encoding: 'base64' });
      hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
    } catch (e) {
      console.warn('[DocumentosService] No se pudo calcular el hash del documento:', e.message);
    }

    const documento = {
      id,
      finca_id: fincaId,
      productor_id: productorId,
      tipo_documento: tipoDocumento,
      nombre_archivo: archivo.name || `documento${extension}`,
      uri_local: destino,
      mime: archivo.mimeType || 'application/octet-stream',
      tamano_bytes: archivo.size ?? null,
      hash_sha256: hash,
      sync_status: 'pending',
      creado_en: new Date(),
    };

    await db().insert(documentosFinca).values(documento);
    return documento;
  }

  static async listarPorProductor(productorId) {
    return db()
      .select()
      .from(documentosFinca)
      .where(eq(documentosFinca.productor_id, productorId));
  }

  /**
   * Vincula los documentos capturados durante el wizard (sin finca aún) a la
   * finca recién creada.
   */
  static async vincularAFinca(documentoIds, fincaId) {
    const sqlite = db();
    for (const docId of documentoIds) {
      await sqlite
        .update(documentosFinca)
        .set({ finca_id: fincaId })
        .where(eq(documentosFinca.id, docId));
    }
  }

  static async eliminar(documento) {
    try {
      await FileSystem.deleteAsync(documento.uri_local, { idempotent: true });
    } catch (e) {
      console.warn('[DocumentosService] No se pudo borrar el archivo local:', e.message);
    }
    await db().delete(documentosFinca).where(eq(documentosFinca.id, documento.id));
  }
}
