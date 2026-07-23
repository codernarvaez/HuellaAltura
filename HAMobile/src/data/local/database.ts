import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as schema from './esquema';
import actividadesTrazabilidadData from '../actividadesTrazabilidad.json';

/**
 * Versión actual del esquema local. Incrementar al cambiar la forma de una tabla
 * y añadir el paso correspondiente en `aplicarMigraciones`.
 */
const ESQUEMA_VERSION = 1;

/**
 * Gestión de la base de datos cifrada (RS-SEC-004)
 */
export class DatabaseManager {
  private static db: any = null;

  /**
   * Migra el esquema local de forma incremental usando `PRAGMA user_version`.
   *
   * Antes aquí había un `DROP TABLE` incondicional de `expedientes` y
   * `datos_agroambientales` en cada arranque, lo que borraba los registros
   * capturados en campo que aún no se habían sincronizado. Ahora la recreación
   * ocurre una sola vez, para migrar instalaciones con el esquema antiguo
   * (`finca_id`/`expediente_id`) al actual (`dato_id`).
   */
  private static async aplicarMigraciones(sqlite: any) {
    const res = await sqlite.execute('PRAGMA user_version');
    const versionActual: number = res.rows?.[0]?.user_version ?? 0;

    if (versionActual >= ESQUEMA_VERSION) return;

    if (versionActual < 1) {
      // Instalaciones previas a la versión 1 tienen `expedientes` y
      // `datos_agroambientales` con columnas incompatibles. Se recrean una vez.
      sqlite.execute('DROP TABLE IF EXISTS "expedientes"');
      sqlite.execute('DROP TABLE IF EXISTS "datos_agroambientales"');
    }

    sqlite.execute(`PRAGMA user_version = ${ESQUEMA_VERSION}`);
  }

  /**
   * Inicializa la base de datos cifrada usando el PIN del usuario y el ID del hardware.
   */
  static async initialize(userPin: string) {
    if (this.db) return this.db;

    const hardwareId = Application.getAndroidId() || 'ios_placeholder_id';
    const salt = 'eudr_v1_salt';

    // TODO(C1): esto es un único digest SHA-256, no una derivación con coste.
    // Sustituir por PBKDF2 con iteraciones y salt por instalación.
    const encryptionKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${userPin}:${hardwareId}:${salt}`
    );

    const sqlite = open({
      name: 'hamobile_secure_v2.sqlite',
      encryptionKey: encryptionKey,
    });

    // Migraciones de esquema versionadas (no destructivas tras la primera vez)
    await this.aplicarMigraciones(sqlite);

    // Crear tablas necesarias si no existen (Inicialización)
    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "productores" (
        "id" text PRIMARY KEY NOT NULL,
        "first_name" text NOT NULL,
        "last_name" text,
        "cedula_id" text NOT NULL,
        "email" text,
        "phone_number" text,
        "edad" integer,
        "genero" text,
        "nivel_educativo" text,
        "organizacion" text,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);
    
    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "fincas" (
        "id" text PRIMARY KEY NOT NULL,
        "nombre" text NOT NULL,
        "productor_id" text,
        "provincia" text NOT NULL,
        "canton" text,
        "parroquia" text,
        "barrio_sector" text,
        "area_total_ha" real NOT NULL,
        "area_cultivada_ha" real,
        "tenencia" text,
        "geometria_geojson" text NOT NULL,
        "latitud_centro" real,
        "longitud_centro" real,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "expedientes" (
        "id" text PRIMARY KEY NOT NULL,
        "dato_id" text NOT NULL,
        "productor_id" text NOT NULL,
        "organizacion_inquilino" text,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "datos_agroambientales" (
        "id" text PRIMARY KEY NOT NULL,
        "finca_id" text NOT NULL,
        "indice_shannon" real,
        "indice_simpson" real,
        "uso_suelo" text,
        "cobertura_forestal" text,
        "sistema_produccion" text,
        "biomasa_arboles" real,
        "biomasa_cafe" real,
        "hojarasca_mantillo" real,
        "carbono_organico_suelo" real,
        "total_stock_carbono" real,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "variables_dinamicas" (
        "id" text PRIMARY KEY NOT NULL,
        "dato_id" text NOT NULL,
        "nombre" text NOT NULL,
        "valor" text NOT NULL,
        "tipo_dato" text DEFAULT 'STRING' NOT NULL,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "vertices_poligono" (
        "id" text PRIMARY KEY NOT NULL,
        "tenant_id" text NOT NULL,
        "finca_id" text NOT NULL,
        "latitud" real NOT NULL,
        "longitud" real NOT NULL,
        "orden_secuencia" integer NOT NULL,
        "precision_metros" real,
        FOREIGN KEY ("finca_id") REFERENCES "fincas"("id") ON UPDATE no action ON DELETE cascade
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "cola_sincronizacion" (
        "id" text PRIMARY KEY NOT NULL,
        "tenant_id" text NOT NULL,
        "nombre_entidad" text NOT NULL,
        "id_entidad" text NOT NULL,
        "operacion" text NOT NULL,
        "datos" text NOT NULL,
        "estado" text DEFAULT 'PENDIENTE' NOT NULL,
        "conteo_reintentos" integer DEFAULT 0 NOT NULL,
        "ultimo_error" text,
        "creado_en" integer NOT NULL,
        "procesado_en" integer
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "empleados" (
        "id" text PRIMARY KEY NOT NULL,
        "productor_id" text,
        "nombre" text NOT NULL,
        "cedula" text,
        "edad" integer NOT NULL,
        "telefono" text,
        "salario_jornal" real,
        "activo" integer DEFAULT 1 NOT NULL,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "documentos_finca" (
        "id" text PRIMARY KEY NOT NULL,
        "finca_id" text,
        "productor_id" text,
        "tipo_documento" text NOT NULL,
        "nombre_archivo" text NOT NULL,
        "uri_local" text NOT NULL,
        "mime" text NOT NULL,
        "tamano_bytes" integer,
        "hash_sha256" text,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "labores_locales" (
        "id" text PRIMARY KEY NOT NULL,
        "finca_id" text NOT NULL,
        "nombre" text NOT NULL,
        "tipo_proceso" text,
        "mes" text NOT NULL,
        "cantidad_proyectada" text,
        "estado" text DEFAULT 'PLANIFICADO' NOT NULL,
        "origen" text DEFAULT 'local' NOT NULL,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "ejecuciones_locales" (
        "id" text PRIMARY KEY NOT NULL,
        "labor_id" text NOT NULL,
        "finca_id" text NOT NULL,
        "persona_desarrollo" text NOT NULL,
        "empleado_id" text,
        "nombre_jornalero" text,
        "edad_jornalero" integer,
        "dias_trabajo" real,
        "salario" real,
        "detalle_aplicacion" text,
        "insumos_json" text DEFAULT '[]' NOT NULL,
        "herramientas_json" text DEFAULT '[]' NOT NULL,
        "foto_uri" text,
        "foto_hash" text,
        "latitud" real,
        "longitud" real,
        "watermark_text" text,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "muestras_locales" (
        "id" text PRIMARY KEY NOT NULL,
        "finca_id" text NOT NULL,
        "finca_nombre" text,
        "tipo_proceso" text NOT NULL,
        "peso_lb" real NOT NULL,
        "observaciones" text,
        "latitud" real,
        "longitud" real,
        "sync_status" text DEFAULT 'pending' NOT NULL,
        "creado_en" integer NOT NULL
      );
    `);

    sqlite.execute(`
      CREATE TABLE IF NOT EXISTS "actividades_trazabilidad" (
        "id" text PRIMARY KEY NOT NULL,
        "numero" integer,
        "etapa" text,
        "mes" text,
        "actividad" text,
        "detalle_tecnico" text,
        "responsable" text,
        "jornales_ha" text,
        "precio_jornal" real,
        "insumos" text,
        "cantidad_ha" text,
        "unidad" text,
        "herramientas" text,
        "dato_capturar" text
      );
    `);

    // Seed data si está vacío
    const countRes = await sqlite.execute('SELECT COUNT(*) as c FROM actividades_trazabilidad');
    if (countRes.rows?.[0]?.c === 0) {
      await sqlite.execute('BEGIN TRANSACTION');
      try {
        for (let idx = 0; idx < actividadesTrazabilidadData.length; idx++) {
          const act = actividadesTrazabilidadData[idx];
          await sqlite.execute(
            `INSERT INTO actividades_trazabilidad (
              id, numero, etapa, mes, actividad, detalle_tecnico,
              responsable, jornales_ha, precio_jornal, insumos,
              cantidad_ha, unidad, herramientas, dato_capturar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              idx.toString(),
              parseInt(act['N°'] as string, 10) || 0,
              act['Etapa'] || '',
              act['Mes'] || '',
              act['Actividad'] || '',
              act['Detalle técnico / Base normativa Organica y Comercio Justo'] || '',
              act['Responsable'] || '',
              act['Jornales/ha (ref.)'] || '',
              parseFloat(act['Precio jornal USD (ref.)'] as string) || 0,
              act['Insumo(s)'] || '',
              act['Cantidad/ha (ref.)'] || '',
              act['Unidad'] || '',
              act['Herramientas / Equipo'] || '',
              act['Dato a capturar en Blockchain (trazabilidad)'] || ''
            ]
          );
        }
        await sqlite.execute('COMMIT');
      } catch (error) {
        await sqlite.execute('ROLLBACK');
        console.error('Seed transaction failed:', error);
      }
    }

    this.db = drizzle(sqlite, { schema });
    return this.db;
  }

  static get instance() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize(pin) first.');
    }
    return this.db;
  }
}

export const db = () => DatabaseManager.instance;
