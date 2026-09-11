import * as Crypto from 'expo-crypto';
import { db } from '../data/local/database';
import {
  fincas,
  datosAgroambientales,
  expedientes,
  empleados,
  laboresLocales,
  ejecucionesLocales,
  muestrasLocales,
} from '../data/local/esquema';
import { eq } from 'drizzle-orm';

/**
 * Modo demostración: usuarios locales por rol y datos sembrados en SQLite.
 *
 * Permite demostrar el flujo completo de uso en campo (productor, técnico de
 * campo y auditor interno) en un dispositivo sin conexión ni backend. Todo lo
 * que se crea en este modo queda con sync_status 'pending'; cuando el usuario
 * inicie sesión real, la sincronización pendiente sigue el flujo normal.
 */

export const USUARIOS_DEMO = {
  PRODUCTOR: {
    id: 'demo-productor-001',
    first_name: 'María',
    last_name: 'Quishpe',
    email: 'productora@demo.huellaaltura.app',
    identifier: '1104567890',
    phone_number: '0987654321',
    edad: 42,
    genero: 'FEMENINO',
    nivel_educativo: 'SECUNDARIA',
    organizacion: 'PROCAFEQ Quilanga',
    role_name: 'PRODUCTOR',
    is_demo: true,
  },
  TECNICO_CAMPO: {
    id: 'demo-tecnico-001',
    first_name: 'Carlos',
    last_name: 'Ramírez',
    email: 'tecnico@demo.huellaaltura.app',
    identifier: '1102233445',
    phone_number: '0991122334',
    edad: 35,
    genero: 'MASCULINO',
    nivel_educativo: 'SUPERIOR',
    organizacion: 'PROCAFEQ Quilanga',
    role_name: 'TECNICO_CAMPO',
    is_demo: true,
  },
  AUDITOR_INTERNO: {
    id: 'demo-auditor-001',
    first_name: 'Lucía',
    last_name: 'Betancourt',
    email: 'auditora@demo.huellaaltura.app',
    identifier: '1109988776',
    phone_number: '0985566778',
    edad: 39,
    genero: 'FEMENINO',
    nivel_educativo: 'SUPERIOR',
    organizacion: 'PROCAFEQ Quilanga',
    role_name: 'AUDITOR_INTERNO',
    is_demo: true,
  },
};

const PRODUCTOR_ID = USUARIOS_DEMO.PRODUCTOR.id;
const FINCA_AHUACATE = 'demo-finca-001';
const FINCA_PALMAS = 'demo-finca-002';

// Polígonos aproximados en el cantón Quilanga, Loja (WGS84)
const POLIGONO_AHUACATE = {
  type: 'Polygon',
  coordinates: [[
    [-79.39860, -4.31020],
    [-79.39720, -4.31035],
    [-79.39705, -4.31180],
    [-79.39840, -4.31210],
    [-79.39895, -4.31110],
    [-79.39860, -4.31020],
  ]],
};

const POLIGONO_PALMAS = {
  type: 'Polygon',
  coordinates: [[
    [-79.40510, -4.29840],
    [-79.40395, -4.29855],
    [-79.40380, -4.29975],
    [-79.40500, -4.29990],
    [-79.40510, -4.29840],
  ]],
};

const MES_ACTUAL = () => [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
][new Date().getMonth()];

export class DemoService {
  /**
   * Siembra los datos de demostración una sola vez (idempotente).
   */
  static async seedIfNeeded() {
    const sqlite = db();
    const existente = await sqlite
      .select()
      .from(fincas)
      .where(eq(fincas.id, FINCA_AHUACATE))
      .limit(1);
    if (existente.length > 0) return;

    const ahora = new Date();

    // --- Fincas ---
    await sqlite.insert(fincas).values([
      {
        id: FINCA_AHUACATE,
        nombre: 'El Ahuacate',
        productor_id: PRODUCTOR_ID,
        provincia: 'Loja',
        canton: 'Quilanga',
        parroquia: 'Quilanga',
        barrio_sector: 'El Ahuacate',
        area_total_ha: 3.0,
        area_cultivada_ha: 2.4,
        tenencia: 'PROPIA',
        geometria_geojson: JSON.stringify(POLIGONO_AHUACATE),
        latitud_centro: -4.3111,
        longitud_centro: -79.3980,
        sync_status: 'pending',
        creado_en: ahora,
      },
      {
        id: FINCA_PALMAS,
        nombre: 'Las Palmas',
        productor_id: PRODUCTOR_ID,
        provincia: 'Loja',
        canton: 'Quilanga',
        parroquia: 'San Antonio de las Aradas',
        barrio_sector: 'Las Palmas',
        area_total_ha: 2.2,
        area_cultivada_ha: 1.8,
        tenencia: 'POSESION',
        geometria_geojson: JSON.stringify(POLIGONO_PALMAS),
        latitud_centro: -4.2991,
        longitud_centro: -79.4045,
        sync_status: 'pending',
        creado_en: ahora,
      },
    ]);

    // --- Datos agroambientales y expedientes ---
    const datoAhuacate = Crypto.randomUUID();
    const datoPalmas = Crypto.randomUUID();
    await sqlite.insert(datosAgroambientales).values([
      {
        id: datoAhuacate,
        finca_id: FINCA_AHUACATE,
        indice_shannon: 2.56,
        indice_simpson: 0.84,
        uso_suelo: 'Sistema Agroforestal de Café',
        cobertura_forestal: JSON.stringify(['Laurel', 'Aguacate', 'Guaba']),
        sistema_produccion: 'Orgánico',
        biomasa_arboles: 32.5,
        biomasa_cafe: 12.7,
        hojarasca_mantillo: 5.4,
        carbono_organico_suelo: 68.8,
        total_stock_carbono: 119.4,
        sync_status: 'pending',
        creado_en: ahora,
      },
      {
        id: datoPalmas,
        finca_id: FINCA_PALMAS,
        indice_shannon: 2.1,
        indice_simpson: 0.78,
        uso_suelo: 'Café bajo sombra',
        cobertura_forestal: JSON.stringify(['Guaba', 'Cedro']),
        sistema_produccion: 'Sostenible',
        biomasa_arboles: 24.9,
        biomasa_cafe: 10.2,
        hojarasca_mantillo: 4.1,
        carbono_organico_suelo: 52.3,
        total_stock_carbono: 91.5,
        sync_status: 'pending',
        creado_en: ahora,
      },
    ]);

    await sqlite.insert(expedientes).values([
      {
        id: Crypto.randomUUID(),
        dato_id: datoAhuacate,
        productor_id: PRODUCTOR_ID,
        organizacion_inquilino: 'PROCAFEQ Quilanga',
        sync_status: 'pending',
        creado_en: ahora,
      },
      {
        id: Crypto.randomUUID(),
        dato_id: datoPalmas,
        productor_id: PRODUCTOR_ID,
        organizacion_inquilino: 'PROCAFEQ Quilanga',
        sync_status: 'pending',
        creado_en: ahora,
      },
    ]);

    // --- Empleados/jornaleros del productor ---
    await sqlite.insert(empleados).values([
      {
        id: 'demo-empleado-001',
        productor_id: PRODUCTOR_ID,
        nombre: 'Juan Pérez Cueva',
        cedula: '1103344556',
        edad: 34,
        telefono: '0993344556',
        salario_jornal: 15.0,
        activo: 1,
        sync_status: 'pending',
        creado_en: ahora,
      },
      {
        id: 'demo-empleado-002',
        productor_id: PRODUCTOR_ID,
        nombre: 'Rosa Jiménez Vega',
        cedula: '1105566778',
        edad: 28,
        telefono: '0987788990',
        salario_jornal: 15.0,
        activo: 1,
        sync_status: 'pending',
        creado_en: ahora,
      },
      {
        id: 'demo-empleado-003',
        productor_id: PRODUCTOR_ID,
        nombre: 'Manuel Sarango',
        cedula: '1101122334',
        edad: 51,
        telefono: null,
        salario_jornal: 16.0,
        activo: 1,
        sync_status: 'pending',
        creado_en: ahora,
      },
    ]);

    // --- Calendario de labores con estados variados ---
    const mesActual = MES_ACTUAL();
    const laborEjecutada = 'demo-labor-002';
    await sqlite.insert(laboresLocales).values([
      {
        id: 'demo-labor-001',
        finca_id: FINCA_AHUACATE,
        nombre: 'Deshierba manual y manejo de coberturas',
        tipo_proceso: 'Mantenimiento del cafetal',
        mes: mesActual,
        cantidad_proyectada: '2.4 hectáreas',
        estado: 'PLANIFICADO',
        origen: 'local',
        sync_status: 'pending',
        creado_en: ahora,
      },
      {
        id: laborEjecutada,
        finca_id: FINCA_AHUACATE,
        nombre: 'Aplicación de abono orgánico (compost)',
        tipo_proceso: 'Fertilización orgánica',
        mes: mesActual,
        cantidad_proyectada: '500 kg/ha',
        estado: 'EJECUTADO',
        origen: 'local',
        sync_status: 'pending',
        creado_en: ahora,
      },
      {
        id: 'demo-labor-003',
        finca_id: FINCA_AHUACATE,
        nombre: 'Poda sanitaria y deschuponado',
        tipo_proceso: 'Manejo del tejido productivo',
        mes: 'Enero',
        cantidad_proyectada: '2.4 hectáreas',
        estado: 'AUDITADO',
        origen: 'local',
        sync_status: 'pending',
        creado_en: ahora,
      },
      {
        id: 'demo-labor-004',
        finca_id: FINCA_PALMAS,
        nombre: 'Control fitosanitario de broca (trampas)',
        tipo_proceso: 'Manejo integrado de plagas',
        mes: mesActual,
        cantidad_proyectada: '18 trampas',
        estado: 'PRE_VALIDADO',
        origen: 'local',
        sync_status: 'pending',
        creado_en: ahora,
      },
    ]);

    await sqlite.insert(ejecucionesLocales).values([
      {
        id: Crypto.randomUUID(),
        labor_id: laborEjecutada,
        finca_id: FINCA_AHUACATE,
        persona_desarrollo: 'JORNALERO',
        empleado_id: 'demo-empleado-001',
        nombre_jornalero: 'Juan Pérez Cueva',
        edad_jornalero: 34,
        dias_trabajo: 2,
        salario: 15.0,
        detalle_aplicacion: 'Aplicación de 500 kg de compost en corona, lote alto.',
        insumos_json: JSON.stringify([
          { nombre: 'Compost', cantidad: 500, unidad: 'kg' },
        ]),
        herramientas_json: JSON.stringify(['Pala', 'Carretilla']),
        foto_uri: null,
        foto_hash: 'demo-hash-no-verificable',
        latitud: -4.3111,
        longitud: -79.398,
        watermark_text: 'Registro de demostración',
        sync_status: 'pending',
        creado_en: ahora,
      },
    ]);

    // --- Muestra de café (Módulo 3) ---
    await sqlite.insert(muestrasLocales).values([
      {
        id: Crypto.randomUUID(),
        finca_id: FINCA_AHUACATE,
        finca_nombre: 'El Ahuacate',
        tipo_proceso: 'Lavado',
        peso_lb: 1.1,
        observaciones: 'Muestra del lote alto, cosecha de la semana.',
        latitud: -4.3111,
        longitud: -79.398,
        sync_status: 'pending',
        creado_en: ahora,
      },
    ]);
  }
}
