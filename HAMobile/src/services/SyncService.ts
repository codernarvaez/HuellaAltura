import { db } from '../data/local/database';
import { fincas, expedientes, datosAgroambientales, variablesDinamicas, productores } from '../data/local/esquema';
import { eq, inArray } from 'drizzle-orm';
import { EUDRService } from './EUDRService';

export class SyncService {
  /**
   * Sincroniza los datos locales con el servidor siguiendo el orden de integridad referencial:
   * 1. Fincas
   * 2. Expedientes (con datos agroambientales y variables anidados)
   */
  static async syncAll(token: string) {
    try {
      const sqlite = db();
      const eudrService = new (EUDRService as any)(token);
      
      // 1. Sincronizar Fincas Pendientes
      const pendingFincas = await sqlite.select().from(fincas).where(eq(fincas.sync_status, 'pending'));
      
      for (const finca of pendingFincas) {
        console.log(`[Sync] Sincronizando finca: ${finca.nombre}`);
        try {
          const payloadFinca = {
            nombre: finca.nombre,
            provincia: finca.provincia,
            canton: finca.canton,
            parroquia: finca.parroquia,
            area_total_ha: finca.area_total_ha,
            area_cultivada_ha: finca.area_cultivada_ha,
            tenencia: (finca.tenencia || 'PROPIA').toUpperCase(),
            latitud: finca.latitud_centro,
            longitud: finca.longitud_centro,
            poligono: JSON.parse(finca.geometria_geojson),
            productor_id: finca.productor_id // Usamos el ID del productor vinculado
          };

          const responseFinca = await eudrService.crearFinca(payloadFinca);
          const backendFincaId = responseFinca.id;

          // Actualizar estado local
          await sqlite.update(fincas)
            .set({ sync_status: 'synced' })
            .where(eq(fincas.id, finca.id));

          // 2. Buscar Expedientes vinculados a esta Finca
          const linkedExpedientes = await sqlite.select()
            .from(expedientes)
            .where(eq(expedientes.finca_id, finca.id));

          for (const exp of linkedExpedientes) {
            console.log(`[Sync] Sincronizando expediente vinculado a finca ${finca.nombre}`);
            
            // Buscar datos agroambientales para este expediente
            const linkedDatos = await sqlite.select()
              .from(datosAgroambientales)
              .where(eq(datosAgroambientales.expediente_id, exp.id));

            const datosParaEnviar = [];
            for (const dato of linkedDatos) {
              // Buscar variables dinámicas para estos datos
              const linkedVars = await sqlite.select()
                .from(variablesDinamicas)
                .where(eq(variablesDinamicas.dato_id, dato.id));

              datosParaEnviar.push({
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
                variables: linkedVars.map(v => ({
                  nombre: v.nombre,
                  valor: v.valor,
                  tipo_dato: v.tipo_dato
                }))
              });
            }

            // Según la documentación, el expediente puede enviarse con sus datos agroambientales
            const payloadExp = {
              productor_id: exp.productor_id,
              finca_id: backendFincaId, // Usamos el ID devuelto por el backend
              organizacion_inquilino: exp.organizacion_inquilino,
              datos_agroambientales: datosParaEnviar[0] // Enviamos el primero si hay varios, o ajustamos según API
            };

            await eudrService.crearExpediente(payloadExp);

            // Marcar expediente y sus hijos como sincronizados
            await sqlite.update(expedientes).set({ sync_status: 'synced' }).where(eq(expedientes.id, exp.id));
            await sqlite.update(datosAgroambientales).set({ sync_status: 'synced' }).where(eq(datosAgroambientales.expediente_id, exp.id));
            // Las variables se marcan via dato_id
            for (const d of linkedDatos) {
               await sqlite.update(variablesDinamicas).set({ sync_status: 'synced' }).where(eq(variablesDinamicas.dato_id, d.id));
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
