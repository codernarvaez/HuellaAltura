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
  cantidad_proyectada: string;
}

export interface LaborAgricolaOut {
  id: string;
  finca_id: string;
  nombre: string;
  tipo_proceso: string;
  mes: string;
  cantidad_proyectada: string;
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
  id: string;
  nombre: string;
  tipo_proceso: string;
  estado: string;
  cantidad_proyectada: string;
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

export interface SubirEvidenciaResponse {
  mensaje: string;
  foto_url: string;
  foto_hash: string;
}

// ============================================================
// INTERFACES - ACOPIO (Conexión con Módulo 3)
// ============================================================

export interface MuestraOut {
  id: string;
  fincaId: string;
  productorId: string;
  codigoQR: string;
  tipoProceso: string;
  pesoKg: number;
  evidenciaFoto?: string;
  creadoEn: string;
}

export interface FincaConMuestras {
  id: string;
  nombre: string;
  provincia?: string;
  canton?: string;
  totalMuestras: number;
  ultimaMuestra: string;
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

function authHeadersMultipart(token?: string): Record<string, string> {
  const headers: Record<string, string> = {};
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
    const cleanPayload = {
      nombre: payload.nombre,
      tipo_proceso: payload.tipo_proceso,
      mes: payload.mes,
      cantidad_proyectada: payload.cantidad_proyectada,
      finca_id: payload.finca_id
    };
    
    console.log('📦 Agendando labor (payload limpio):', cleanPayload);
    
    const response = await fetch(`${LABORES_BASE}/agendar`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(cleanPayload),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data);
    
    if (!response.ok) {
      throw new Error(data.detail || data.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    return data;
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
   * 🔥 Sube una foto de evidencia a Cloudinary
   * POST /api/v1/labores/subir-evidencia
   */
  static async subirEvidencia(
    file: File,
    token?: string
  ): Promise<SubirEvidenciaResponse> {
    console.log('📤 Subiendo evidencia:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${LABORES_BASE}/subir-evidencia`, {
      method: "POST",
      headers: authHeadersMultipart(token),
      body: formData,
    });
    
    const data = await response.json();
    console.log('📡 Response subir evidencia:', data);
    
    if (!response.ok) {
      throw new Error(data.detail || data.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    return data;
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

  // ============================================================
  // 🔥 MÉTODOS DE CONEXIÓN CON ACOPIO (Módulo 3)
  // ============================================================

  /**
   * Obtiene las fincas que tienen muestras pendientes de análisis
   * GET /api/v1/labores/fincas-con-muestras
   */
  static async getFincasConMuestras(
    token?: string
  ): Promise<FincaConMuestras[]> {
    console.log('🔍 Obteniendo fincas con muestras');
    
    const response = await fetch(`${LABORES_BASE}/fincas-con-muestras`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Obtiene las muestras de una finca para el módulo de acopio
   * GET /api/v1/labores/muestras/{finca_id}
   */
  static async getMuestrasByFinca(
    fincaId: string,
    token?: string
  ): Promise<MuestraOut[]> {
    console.log('🔍 Obteniendo muestras para finca:', fincaId);
    
    const response = await fetch(`${LABORES_BASE}/muestras/${fincaId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Registra una nueva muestra de café en finca
   * POST /api/v1/labores/muestras
   */
  static async registrarMuestra(
    payload: {
      fincaId: string;
      productorId: string;
      codigoQR: string;
      tipoProceso: "LAVADO" | "NATURAL" | "HONEY" | "SEMILAVADO";
      peso_lb: number;
      evidenciaFoto?: string;
    },
    token?: string
  ): Promise<{ mensaje: string; muestra_id: string }> {
    console.log('📋 Registrando muestra:', payload);
    
    const response = await fetch(`${LABORES_BASE}/muestras`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Registra análisis físico de una muestra
   * POST /api/v1/labores/muestras/{muestraId}/analisis-fisico
   */
  static async registrarAnalisisFisico(
    muestraId: string,
    payload: {
      humedad: number;
      criba: number;
      densidad: number;
      defectosPrim: number;
      defectosSec: number;
    },
    token?: string
  ): Promise<any> {
    console.log('🔬 Registrando análisis físico para muestra:', muestraId);
    
    const response = await fetch(`${LABORES_BASE}/muestras/${muestraId}/analisis-fisico`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Registra análisis sensorial (catación) de una muestra
   * POST /api/v1/labores/muestras/{muestraId}/analisis-sensorial
   */
  static async registrarAnalisisSensorial(
    muestraId: string,
    payload: {
      fraganciaAroma: number;
      sabor: number;
      saborResidual: number;
      acidez: number;
      cuerpo: number;
      uniformidad: number;
      balance: number;
      tazaLimpia: number;
      dulzor: number;
      puntajeCatador: number;
      defectos: number;
      nivelTueste: "CLARO" | "MEDIO" | "OSCURO";
    },
    token?: string
  ): Promise<any> {
    console.log('☕ Registrando análisis sensorial para muestra:', muestraId);
    
    const response = await fetch(`${LABORES_BASE}/muestras/${muestraId}/analisis-sensorial`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Aprueba una orden de compra con validación EUDR
   * POST /api/v1/labores/ordenes-compra/aprobar
   */
  static async aprobarOrdenCompra(
    payload: {
      muestraId: string;
      precioAcordado: number;
      volumenKg: number;
      primas?: number;
    },
    token?: string
  ): Promise<{ mensaje: string; orden_id: string }> {
    console.log('🛒 Aprobando orden de compra:', payload);
    
    const response = await fetch(`${LABORES_BASE}/ordenes-compra/aprobar`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Registra ingreso a bodega
   * POST /api/v1/labores/bodega/ingreso
   */
  static async registrarIngresoBodega(
    payload: {
      ordenCompraId: string;
      codigoQR: string;
      pesoIngresado_lb: number;
      tipoProceso: string;
    },
    token?: string
  ): Promise<any> {
    console.log('📦 Registrando ingreso a bodega:', payload);
    
    const response = await fetch(`${LABORES_BASE}/bodega/ingreso`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Procesa trilla (balance de masa)
   * POST /api/v1/labores/trilla/procesar
   */
  static async procesarTrilla(
    payload: {
      inventarioId: number;
      factorRendimiento: number;
    },
    token?: string
  ): Promise<any> {
    console.log('⚙️ Procesando trilla:', payload);
    
    const response = await fetch(`${LABORES_BASE}/trilla/procesar`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Registra despacho de café
   * POST /api/v1/labores/despachos/registrar
   */
  static async registrarDespacho(
    payload: {
      inventarioId: number;
      peso_salida_kg: number;
      destino: string;
    },
    token?: string
  ): Promise<any> {
    console.log('🚢 Registrando despacho:', payload);
    
    const response = await fetch(`${LABORES_BASE}/despachos/registrar`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Obtiene certificado de trazabilidad
   * GET /api/v1/labores/despachos/certificado/{inventario_id}
   */
  static async getCertificadoTrazabilidad(
    inventarioId: number,
    token?: string
  ): Promise<any> {
    console.log('📄 Obteniendo certificado:', inventarioId);
    
    const response = await fetch(`${LABORES_BASE}/despachos/certificado/${inventarioId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Descarga certificado de trazabilidad en PDF
   * GET /api/v1/labores/despachos/certificado/{inventario_id}/pdf
   */
  static async descargarCertificadoPDF(
    inventarioId: number,
    token?: string
  ): Promise<Blob> {
    console.log('📄 Descargando certificado PDF:', inventarioId);
    
    const response = await fetch(`${LABORES_BASE}/despachos/certificado/${inventarioId}/pdf`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || `Error ${response.status}: ${response.statusText}`);
    }
    
    return response.blob();
  }
}