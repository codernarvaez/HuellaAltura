// Lote de demostración hasta que exped-service exponga lotes y fases (ver HAContract/smart_contract.md §8).
// Los hashes que se calculan con estos datos son reales; no hay transacciones porque el contrato no está desplegado.
// Los datos personales son ficticios.
import { hashJson } from "./hash";
import type { LoteTrazable } from "./pipeline";

const POLIGONO_FINCA = {
  type: "Polygon",
  coordinates: [
    [
      [-79.2239, -4.2618],
      [-79.2223, -4.2618],
      [-79.2223, -4.2633],
      [-79.2239, -4.2633],
      [-79.2239, -4.2618],
    ],
  ],
};

const trabajador = (n: number, rol: string) => ({
  nombres: `Trabajador ${n}`,
  apellidos: "Demo",
  identificacion: `000000000${n}`,
  telefono: "0990000000",
  rol,
});

export const LOTE_DEMO: LoteTrazable = {
  tenant: "APECAEL",
  codigo: "AHU-P01-L1",
  sal: "demo-sal-no-usar-en-produccion",
  etapas: {
    ORIGEN: {
      estado: "Completada",
      fechaInicio: "2023-01-16T14:00:00Z",
      fechaFin: "2023-01-16T14:00:00Z",
      datos: {
        tenant: "APECAEL",
        finca_eudr_id: "uuidv4-3F9A1C2E-8B7D4",
        finca_nombre: "El Ahuacate",
        provincia: "Loja",
        canton: "Loja",
        parroquia: "Vilcabamba",
        tenencia: "PROPIA",
        area_total_ha: 3,
        centroide: [-4.26, -79.22],
        poligono_hash: hashJson(POLIGONO_FINCA),
        parcela_codigo: "AHU-P01",
        tipo_terreno: "Regular",
        altitud_msnm: 1650,
        ph_suelo: 5.8,
        textura: "Franco-arcillosa",
        orientacion_ladera: "Orientación al Norte",
        cortinas_rompevientos: true,
        lote_codigo: "AHU-P01-L1",
        hectareas_asignadas: 1.5,
        tipo_zona: "Zona Inclinada",
      },
      privado: {
        poligono: POLIGONO_FINCA,
        coordenadas: [-4.2625, -79.2231],
        productor_id: "00000000-0000-4000-8000-000000000001",
      },
    },
    CUMPLIMIENTO_EUDR: {
      estado: "Completada",
      fechaInicio: "2023-01-30T16:20:00Z",
      fechaFin: "2023-02-01T10:00:00Z",
      datos: {
        expediente_estado: "APROBADO",
        gee_resultado: "APROBADO",
        deforestacion_detectada: false,
        fecha_corte: "2020-12-31",
        fuente_satelital: "Google Earth Engine",
        dds_codigo: "DDS-2023-7F3A9C21",
        dds_estado: "VIGENTE",
        dds_vencimiento: "2027-02-01",
        dds_documento_hash: null,
        total_stock_carbono: 86.4,
        cobertura_forestal: "Sistema agroforestal",
      },
      privado: {
        auditor_id: "00000000-0000-4000-8000-000000000002",
        observaciones: "Sin cambios de cobertura respecto a la línea base.",
      },
    },
    SEMILLA: {
      estado: "Completada",
      fechaInicio: "2023-02-13T13:00:00Z",
      fechaFin: "2023-02-13T13:00:00Z",
      datos: {
        variedad: "Geisha",
        origen: "Vivero comunitario de Vilcabamba",
        distribuidor: "Vivero San Pedro",
        metodo_secado: "Secado lento a la sombra sobre camas africanas",
        seleccion: "Clasificación manual grano a grano",
        olor: "Fresco",
        color: "Crema claro",
        integridad_pergamino: "98% de granos con pergamino intacto",
        anexo_hash: null,
      },
    },
    SEMBRADO: {
      estado: "Completada",
      fechaInicio: "2023-02-13T13:00:00Z",
      fechaFin: "2023-03-10T22:00:00Z",
      datos: {
        plantas_sembradas: 7500,
        densidad_plantas_ha: 5000,
        trabajadores_total: 3,
        trabajadores_por_rol: { Agricultor: 3 },
      },
      privado: { trabajadores: [1, 2, 3].map((n) => trabajador(n, "Agricultor")) },
    },
    COSECHA: {
      estado: "Completada",
      fechaInicio: "2026-05-04T11:00:00Z",
      fechaFin: "2026-07-17T22:00:00Z",
      cantidadKg: 6240,
      datos: {
        tipo_cosecha: "Selectiva",
        pases: 4,
        madurez_pct: 92,
        trabajadores_total: 6,
        trabajadores_por_rol: { Recolector: 5, Supervisor: 1 },
      },
      privado: {
        trabajadores: [
          ...[4, 5, 6, 7, 8].map((n) => trabajador(n, "Recolector")),
          trabajador(9, "Supervisor"),
        ],
      },
    },
    DESPULPADO: {
      estado: "Completada",
      fechaInicio: "2026-07-18T12:00:00Z",
      fechaFin: "2026-07-20T18:00:00Z",
      cantidadKg: 2700,
      datos: {
        kg_entrada: 6240,
        proceso: "Lavado",
        horas_fermentacion: 36,
        trabajadores_total: 2,
        trabajadores_por_rol: { Operario: 2 },
      },
      privado: { trabajadores: [10, 11].map((n) => trabajador(n, "Operario")) },
    },
    SECADO: {
      estado: "Completada",
      fechaInicio: "2026-07-20T18:00:00Z",
      fechaFin: "2026-08-14T15:00:00Z",
      cantidadKg: 1250,
      datos: {
        kg_entrada: 2700,
        metodo_secado: "Secado lento a la sombra sobre camas africanas",
        humedad_final_pct: 11,
        dias_secado: 25,
        trabajadores_total: 2,
        trabajadores_por_rol: { Operario: 2 },
      },
      privado: { trabajadores: [10, 11].map((n) => trabajador(n, "Operario")) },
    },
    TOSTADO: {
      estado: "En Proceso",
      fechaInicio: "2026-10-15T13:00:00Z",
      datos: {
        kg_verde_entrada: 1000,
        perfil_tueste: "Medio",
        temperatura_final_c: 205,
        tiempo_tueste_min: 12,
        trabajadores_total: 2,
        trabajadores_por_rol: { Operario: 1, Supervisor: 1 },
      },
      privado: { trabajadores: [trabajador(12, "Operario"), trabajador(9, "Supervisor")] },
    },
  },
};
