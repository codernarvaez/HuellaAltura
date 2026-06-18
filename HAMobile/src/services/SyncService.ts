import { db } from '../data/local/database';
import { fincas, expedientes, datosAgroambientales, variablesDinamicas, productores } from '../data/local/esquema';
import { eq, inArray } from 'drizzle-orm';
import { EUDRService } from './EUDRService';

export class SyncService {
  /**
   * Recopila todos los datos con syncStatus = 'pending', los envía al servidor
   * y los marca como 'synced' si el servidor confirma la recepción.
   */
  static async syncAll(token: string) {
    try {
      const sqlite = db();
      
      // 1. Recopilar datos pendientes
      const pendingProductores = await sqlite.select().from(productores).where(eq(productores.sync_status, 'pending'));
      const pendingFincas = await sqlite.select().from(fincas).where(eq(fincas.syncStatus, 'pending'));
      const pendingExpedientes = await sqlite.select().from(expedientes).where(eq(expedientes.syncStatus, 'pending'));
      const pendingDatos = await sqlite.select().from(datosAgroambientales).where(eq(datosAgroambientales.syncStatus, 'pending'));
      const pendingVariables = await sqlite.select().from(variablesDinamicas).where(eq(variablesDinamicas.syncStatus, 'pending'));

      if (pendingProductores.length === 0 && pendingFincas.length === 0 && pendingExpedientes.length === 0 && pendingDatos.length === 0 && pendingVariables.length === 0) {
        return { success: true, message: 'Nada pendiente por sincronizar.' };
      }

      // 2. Construir el paquete JSON (Payload)
      const syncPackage = {
        productores: pendingProductores.map((p: any) => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          cedula_id: p.cedula_id,
          email: p.email,
          phone_number: p.phone_number,
          edad: p.edad,
          genero: p.genero,
          organizacion: p.organizacion
        })),
        fincas: pendingFincas.map((f: any) => ({
          id: f.id,
          nombre: f.nombre,
          productor_id: f.productorId,
          provincia: f.provincia,
          canton: f.canton,
          parroquia: f.parroquia,
          barrio_sector: f.barrioSector,
          area_total_ha: f.areaTotalHa,
          area_cultivo_ha: f.areaCultivoHa,
          tenencia_tierra: f.tenenciaTierra,
          geometria_geojson: f.geometriaGeoJson,
          latitud_centro: f.latitudCentro,
          longitud_centro: f.longitudCentro
        })),
        expedientes: pendingExpedientes.map((e: any) => ({
          id: e.id,
          finca_id: e.fincaId,
          productor_id: e.productorId,
          organizacion_inquilino: e.organizacionInquilino
        })),
        datos_agroambientales: pendingDatos.map((d: any) => ({
          id: d.id,
          expediente_id: d.expedienteId,
          indice_shannon: d.indiceShannon,
          indice_simpson: d.indiceSimpson,
          uso_suelo: d.usoSuelo,
          cobertura_forestal: d.coberturaForestal,
          sistema_produccion: d.sistemaProduccion,
          biomasa_aerea_tc_ha: d.biomasaAereaTcHa,
          cos_tc_ha: d.cosTcHa,
          total_stock_carbono: d.totalStockCarbono
        })),
        variables_dinamicas: pendingVariables.map((v: any) => ({
          dato_id: v.datoId,
          nombre: v.nombre,
          valor: v.valor,
          tipo_dato: v.tipoDato
        }))
      };

      // 3. Enviar al servidor
      const eudrService = new (EUDRService as any)(token);
      const result = await eudrService.syncUpload(syncPackage);

      // 4. Marcar como sincronizados en local
      if (pendingProductores.length > 0) {
        await sqlite.update(productores)
          .set({ sync_status: 'synced' })
          .where(inArray(productores.id, pendingProductores.map((p: any) => p.id)));
      }

      if (pendingFincas.length > 0) {
        await sqlite.update(fincas)
          .set({ syncStatus: 'synced' })
          .where(inArray(fincas.id, pendingFincas.map((f: any) => f.id)));
      }

      if (pendingExpedientes.length > 0) {
        await sqlite.update(expedientes)
          .set({ syncStatus: 'synced' })
          .where(inArray(expedientes.id, pendingExpedientes.map((e: any) => e.id)));
      }

      if (pendingDatos.length > 0) {
        await sqlite.update(datosAgroambientales)
          .set({ syncStatus: 'synced' })
          .where(inArray(datosAgroambientales.id, pendingDatos.map((d: any) => d.id)));
      }

      if (pendingVariables.length > 0) {
        await sqlite.update(variablesDinamicas)
          .set({ syncStatus: 'synced' })
          .where(inArray(variablesDinamicas.id, pendingVariables.map((v: any) => v.id)));
      }

      return { success: true, result };

    } catch (error) {
      console.error('Error en SyncService.syncAll:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}
