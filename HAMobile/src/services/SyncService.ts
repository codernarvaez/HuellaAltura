import { db } from '../data/local/database';
import { fincas, expedientes, datosAgroambientales, variablesDinamicas, productores } from '../data/local/esquema';
import { eq } from 'drizzle-orm';
import { EUDRService } from './EUDRService';

export class SyncService {
  /**
   * Sincroniza los datos locales con el servidor siguiendo el orden de integridad referencial:
   * 1. Fincas
   * 2. Datos Agroambientales
   * 3. Expedientes
   */
  static async syncAll(token: string) {
    try {
      const sqlite = db();
      const eudrService = new (EUDRService as any)(token);
      
      // 1. Sincronizar Fincas Pendientes
      const pendingFincas = await sqlite.select().from(fincas).where(eq(fincas.sync_status, 'pending'));
      
      for (const finca of pendingFincas) {
        try {
          // Mapeo seguro de tenencia al Enum del Backend
          let mappedTenencia = 'PROPIA';
          const t = (finca.tenencia || '').toUpperCase();
          if (t.includes('ARRENDAMIENTO') || t.includes('ARRENDADA')) mappedTenencia = 'ARRENDAMIENTO';
          else if (t.includes('POSESION')) mappedTenencia = 'POSESION';

          const payloadFinca = {
            nombre: finca.nombre,
            provincia: finca.provincia,
            canton: finca.canton,
            parroquia: finca.parroquia,
            area_total_ha: finca.area_total_ha,
            area_cultivada_ha: finca.area_cultivada_ha,
            tenencia: mappedTenencia,
            latitud: finca.latitud_centro,
            longitud: finca.longitud_centro,
            poligono: finca.geometria_geojson ? JSON.parse(finca.geometria_geojson) : null,
            usuario_id: finca.productor_id, // ID del usuario que registra
            productor_id: finca.productor_id // Requerido por el nuevo backend
          };

          const responseFinca = await eudrService.crearFinca(payloadFinca);
          const backendFincaId = responseFinca.id;

          // Actualizar estado local
          await sqlite.update(fincas)
            .set({ sync_status: 'synced' })
            .where(eq(fincas.id, finca.id));

          // 2. Buscar Datos Agroambientales vinculados a esta Finca
          const pendingDatos = await sqlite.select()
            .from(datosAgroambientales)
            .where(eq(datosAgroambientales.finca_id, finca.id));

          for (const dato of pendingDatos) {
            
            // Buscar variables dinámicas para este dato
            const linkedVars = await sqlite.select()
              .from(variablesDinamicas)
              .where(eq(variablesDinamicas.dato_id, dato.id));

            const payloadDato = {
              finca_id: backendFincaId,
              indice_shannon: dato.indice_shannon,
              indice_simpson: dato.indice_simpson,
              uso_suelo: dato.uso_suelo,
              cobertura_forestal: dato.cobertura_forestal,
              sistema_produccion: dato.sistema_produccion,
              biomasa_arboles: dato.biomasa_arboles || 0,
              biomasa_cafe: dato.biomasa_cafe || 0,
              hojarasca_mantillo: dato.hojarasca_mantillo || 0,
              carbono_organico_suelo: dato.carbono_organico_suelo || 0,
              total_stock_carbono: dato.total_stock_carbono || 0,
              variables: linkedVars.map((v: any) => ({
                nombre: v.nombre,
                valor: String(v.valor), // Convertir a string explícitamente
                tipo_dato: v.tipo_dato
              }))
            };

            const responseDato = await eudrService.crearDatosAgroambientales(payloadDato);
            const backendDatoId = responseDato.id;

            // Marcar dato local como synced
            await sqlite.update(datosAgroambientales).set({ sync_status: 'synced' }).where(eq(datosAgroambientales.id, dato.id));
            // Marcar variables
            for (const v of linkedVars) {
               await sqlite.update(variablesDinamicas).set({ sync_status: 'synced' }).where(eq(variablesDinamicas.id, v.id));
            }

            // 3. Buscar Expediente vinculado a este Dato
            const pendingExpedientes = await sqlite.select()
              .from(expedientes)
              .where(eq(expedientes.dato_id, dato.id));

            for (const exp of pendingExpedientes) {
              const payloadExp = {
                dato_id: backendDatoId,
                organizacion_inquilino: exp.organizacion_inquilino
              };

              await eudrService.crearExpediente(payloadExp);

              // Marcar expediente
              await sqlite.update(expedientes).set({ sync_status: 'synced' }).where(eq(expedientes.id, exp.id));
            }
          }
        } catch (fincaError) {
          console.error(`[Sync] Error sincronizando finca ${finca.nombre}:`, fincaError);
        }
      }

      return { success: true };

    } catch (error) {
      console.error('Error en SyncService.syncAll:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}
