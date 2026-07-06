// src/services/labores.service.ts
import { API_URL } from "./Api_Base";

const LABORES_BASE = `${API_URL}/api/v1/labores`;

// ============================================================
// INTERFACES
// ============================================================

export interface InsumoCreate {
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface LaborAgricolaCreate {
  finca_id: string;
  nombre: string;
  tipo_proceso: string;
  mes: string;
  cantidad_proyectada: number;
}

export interface LaborAgricolaOut {
  id: string;
  finca_id: string;
  nombre: string;
  tipo_proceso: string;
  mes: string;
  cantidad_proyectada: number;
  estado: string;
  creado_en: string;
  actualizado_en: string;
}

export interface EjecucionLaborCreate {
  persona_desarrollo: string;
  nombre_jornalero: string;
  detalle_aplicacion: string;
  salario: number;
  foto_url?: string;
  foto_hash?: string;
  latitud?: number;
  longitud?: number;
  insumos: InsumoCreate[];
  herramientas: string[];
}

export interface EjecucionLaborOut {
  id: string;
  labor_id: string;
  finca_id: string;
  persona_desarrollo: string;
  nombre_jornalero: string;
  detalle_aplicacion: string;
  salario: number;
  foto_url?: string;
  foto_hash?: string;
  latitud?: number;
  longitud?: number;
  timestamp: string;
  insumos: InsumoOut[];
  herramientas: HerramientaOut[];
}

export interface InsumoOut {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface HerramientaOut {
  id: string;
  nombre: string;
}

export interface CalendarioResponse {
  finca_id: string;
  calendario: MesLabor[];
}

export interface MesLabor {
  mes: string;
  total_labores: number;
  labores: LaborResumen[];
}

export interface LaborResumen {
  labor_id: string;
  nombre: string;
  tipo_proceso: string;
  estado: string;
}

export interface LedgerResponse {
  finca_id: string;
  total_registros: number;
  ledger: LedgerRegistro[];
}

export interface LedgerRegistro {
  id_ejecucion: string;
  fecha: string;
  actividad: string;
  tipo_proceso: string;
  persona: string;
  nombre_jornalero: string;
  detalle_aplicacion: string;
  costo: number;
  evidencia: {
    foto_url?: string;
    foto_hash?: string;
    ubicacion?: {
      latitud?: number;
      longitud?: number;
    };
  };
  insumos: InsumoOut[];
  herramientas: string[];
  estado: string;
}

export interface SugerenciaResponse {
  mes: string;
  sugerencias_disponibles: string[];
}

export interface ValidacionNormativaResponse {
  labor_id: string;
  estado_validacion: string;
  detalles: any;
}

export interface AprobacionResponse {
  message: string;
  labor_id: string;
  estado: string;
}

// ============================================================
// UTILIDADES
// ============================================================

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

// ============================================================
// LABORES SERVICE
// ============================================================

export class LaboresService {
  
  /**
   * Agenda una nueva labor agrícola
   * POST /api/v1/labores/agendar
   */
  static async agendarLabor(
    payload: LaborAgricolaCreate,
    token?: string
  ): Promise<LaborAgricolaOut> {
    console.log('Agendando labor:', payload);
    
    const response = await fetch(`${LABORES_BASE}/agendar`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data);
    return handleResponse<LaborAgricolaOut>(response, data);
  }

  /**
   * Obtiene el calendario anual de labores para una finca
   * GET /api/v1/labores/calendario/{finca_id}
   */
  static async obtenerCalendario(
    fincaId: string,
    token?: string
  ): Promise<CalendarioResponse> {
    console.log('Obteniendo calendario para finca:', fincaId);
    
    const response = await fetch(`${LABORES_BASE}/calendario/${fincaId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('Response:', data);
    return handleResponse<CalendarioResponse>(response, data);
  }

  /**
   * Registra la ejecución de una labor
   * POST /api/v1/labores/{labor_id}/ejecutar
   */
  static async ejecutarLabor(
    laborId: string,
    payload: EjecucionLaborCreate,
    token?: string
  ): Promise<EjecucionLaborOut> {
    console.log('Ejecutando labor:', laborId, payload);
    
    const response = await fetch(`${LABORES_BASE}/${laborId}/ejecutar`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('Response:', data);
    return handleResponse<EjecucionLaborOut>(response, data);
  }

  /**
   * Obtiene el ledger de labores ejecutadas (trazabilidad completa)
   * GET /api/v1/labores/ledger/{finca_id}
   */
  static async obtenerLedger(
    fincaId: string,
    token?: string
  ): Promise<LedgerResponse> {
    console.log('Obteniendo ledger para finca:', fincaId);
    
    const response = await fetch(`${LABORES_BASE}/ledger/${fincaId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('Response:', data);
    return handleResponse<LedgerResponse>(response, data);
  }

  /**
   * Obtiene sugerencias paramétricas para un mes
   * GET /api/v1/labores/sugerencias/{mes}
   */
  static async obtenerSugerencias(
    mes: string,
    token?: string
  ): Promise<SugerenciaResponse> {
    console.log('Obteniendo sugerencias para mes:', mes);
    
    const response = await fetch(`${LABORES_BASE}/sugerencias/${mes}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('Response:', data);
    return handleResponse<SugerenciaResponse>(response, data);
  }

  /**
   * Pre-valida una labor contra la normativa
   * POST /api/v1/labores/{labor_id}/validar-norma
   */
  static async validarNormativa(
    laborId: string,
    token?: string
  ): Promise<ValidacionNormativaResponse> {
    console.log('Validando normativa para labor:', laborId);
    
    const response = await fetch(`${LABORES_BASE}/${laborId}/validar-norma`, {
      method: "POST",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('Response:', data);
    return handleResponse<ValidacionNormativaResponse>(response, data);
  }

  /**
   * Aprueba manualmente una labor (auditoría)
   * POST /api/v1/labores/{labor_id}/aprobar
   */
  static async aprobarLabor(
    laborId: string,
    token?: string
  ): Promise<AprobacionResponse> {
    console.log('Aprobando labor:', laborId);
    
    const response = await fetch(`${LABORES_BASE}/${laborId}/aprobar`, {
      method: "POST",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('Response:', data);
    return handleResponse<AprobacionResponse>(response, data);
  }
}