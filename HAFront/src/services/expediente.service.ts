// src/services/expediente.service.ts
import { API_URL } from "./Api_Base";
import { FincaService } from "./finca.service.ts";
import { AgroambientalService } from "./InfoAgroambiental.ts";

const EXPEDIENTES_BASE = `${API_URL}/api/v1/expedientes`;

export interface ExpedienteCreate {
  dato_id: string;
  organizacion_inquilino?: string;
  estado?: string;
}

export interface ExpedienteOut {
  id: string;
  dato_id: string;
  organizacion_inquilino?: string;
  estado: string;
  creado_en: string;
  actualizado_en: string;
  historial?: any[];
  finca?: any;
  dato?: any;
}

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function handleResponse<T>(res: Response, data: any): T {
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Error ${res.status}: ${res.statusText}`);
  }
  return data;
}

export class ExpedienteService {
  
  /**
   * Lista todos los expedientes
   */
  static async list(token?: string): Promise<ExpedienteOut[]> {
    const res = await fetch(EXPEDIENTES_BASE, {
      method: "GET",
      headers: authHeaders(token),
    });
    const data = await res.json();
    return handleResponse<ExpedienteOut[]>(res, data);
  }

  /**
   * Obtiene o crea un expediente para una finca
   */
  static async getOrCreate(
    fincaId: string,
    token?: string
  ): Promise<{ expediente: ExpedienteOut | null; creado: boolean }> {
    try {
      console.log(`🔍 Buscando finca ${fincaId}...`);
      
      // 1. Obtener la finca usando FincaService
      const finca = await FincaService.getById(fincaId, token);
      console.log(`✅ Finca encontrada: ${finca.nombre}`);
      console.log(`👤 Productor: ${finca.usuario_nombre || 'No especificado'}`);
      
      // 2. Obtener los datos agroambientales de la finca usando AgroambientalService
      console.log(`🔍 Buscando datos agroambientales para finca ${fincaId}...`);
      const datos = await AgroambientalService.getByFinca(fincaId, token);
      
      if (!datos || datos.length === 0) {
        console.warn(`⚠️ La finca ${fincaId} no tiene datos agroambientales`);
        return { expediente: null, creado: false };
      }
      
      console.log(`✅ Datos agroambientales encontrados: ${datos.length} registros`);
      
      // Tomar el primer dato agroambiental
      const primerDato = datos[0];
      const datoId = primerDato.id;
      console.log(`📊 Dato ID: ${datoId}`);
      
      // 3. Buscar si ya existe un expediente para este dato
      console.log(`🔍 Buscando expediente existente para dato ${datoId}...`);
      const expedientes = await this.list(token);
      const expedienteExistente = expedientes.find(e => e.dato_id === datoId);
      
      if (expedienteExistente) {
        console.log(`✅ Expediente existente encontrado: ${expedienteExistente.id}`);
        // Enriquecer con finca
        const enriquecido = await this.enrichWithFinca([expedienteExistente], token);
        return { expediente: enriquecido[0] || expedienteExistente, creado: false };
      }
      
      // 4. No existe expediente, crearlo con el nombre del productor
      console.log(`🔄 Creando expediente para finca ${fincaId} con dato_id ${datoId}`);
      
      // Usar el nombre del productor como organizacion_inquilino
      const organizacion = finca.usuario_nombre || 'Productor no especificado';
      
      const payload = {
        dato_id: datoId,
        organizacion_inquilino: organizacion,
        estado: 'PENDIENTE'
      };
      
      console.log('📦 Payload para crear expediente:', payload);
      
      const nuevoExpediente = await this.create(payload, token);
      console.log(`✅ Expediente creado automáticamente: ${nuevoExpediente.id}`);
      
      // Enriquecer el expediente con la finca
      const enriquecido = await this.enrichWithFinca([nuevoExpediente], token);
      
      return { expediente: enriquecido[0] || nuevoExpediente, creado: true };
      
    } catch (e) {
      console.error(`❌ Error en getOrCreate para finca ${fincaId}:`, e.message);
      return { expediente: null, creado: false };
    }
  }

  /**
   * Crea un nuevo expediente
   */
  static async create(payload: ExpedienteCreate, token?: string): Promise<ExpedienteOut> {
    const res = await fetch(EXPEDIENTES_BASE, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return handleResponse<ExpedienteOut>(res, data);
  }

  /**
   * Enriquece los expedientes con la información de la finca
   */
  private static async enrichWithFinca(
    expedientes: ExpedienteOut[],
    token?: string
  ): Promise<ExpedienteOut[]> {
    const enriched = [];
    
    for (const exp of expedientes) {
      try {
        if (exp.dato_id) {
          // Obtener el dato agroambiental por ID
          // Nota: No tenemos un endpoint getById en AgroambientalService
          // Pero podemos obtenerlo si tenemos el finca_id
          // Como no lo tenemos, intentamos obtenerlo de la lista de expedientes
          
          // Buscar el dato en la lista de datos de la finca
          // Para esto necesitaríamos el finca_id, que no tenemos
          // Mejor usamos el dato que ya tenemos
          const dato = exp.dato || null;
          
          if (dato && dato.finca_id) {
            try {
              const finca = await FincaService.getById(dato.finca_id, token);
              exp.finca = finca;
            } catch (e) {
              console.warn(`⚠️ Error obteniendo finca para expediente ${exp.id}:`, e.message);
            }
          }
        }
      } catch (e) {
        console.warn(`⚠️ Error enriqueciendo expediente ${exp.id}:`, e.message);
      }
      
      enriched.push(exp);
    }
    
    return enriched;
  }
}