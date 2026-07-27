// src/services/finca.service.ts
import { API_URL } from "./Api_Base";

const FINCAS_BASE = `${API_URL}/api/v1/fincas`;

// ============================================================
// INTERFACES
// ============================================================

export interface FincaCreate {
  nombre: string;
  usuario_id: string;        // 🔥 SOLO PARA CREAR
  productor_id: string;
  provincia?: string;
  canton?: string;
  parroquia?: string;
  sector?: string;
  area_total_ha?: number;
  area_cultivada_ha?: number;
  tenencia?: string;
  poligono?: any;
  latitud?: number;
  longitud?: number;
  variedad_cafe?: string;
  densidad_siembra?: string;
  origen_semilla?: string;
  anio_establecimiento?: number;
}

export interface FincaUpdate {
  nombre?: string;
  productor_id?: string;
  provincia?: string;
  canton?: string;
  parroquia?: string;
  sector?: string;
  area_total_ha?: number;
  area_cultivada_ha?: number;
  tenencia?: string;
  poligono?: any;
  latitud?: number;
  longitud?: number;
  variedad_cafe?: string;
  densidad_siembra?: string;
  origen_semilla?: string;
  anio_establecimiento?: number;
}

export interface FincaOut {
  id: string;
  nombre: string;
  usuario_id?: string;
  productor_id: string;
  eudr_id?: string;
  provincia?: string;
  canton?: string;
  parroquia?: string;
  sector?: string;
  area_total_ha?: number;
  area_cultivada_ha?: number;
  tenencia?: string;
  poligono?: any;
  latitud?: number;
  longitud?: number;
  variedad_cafe?: string;
  densidad_siembra?: string;
  origen_semilla?: string;
  anio_establecimiento?: number;
  creado_en?: string;
  actualizado_en?: string;
}

// ============================================================
// UTILIDADES
// ============================================================

function authHeaders(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function handleResponse<T>(res: Response, data: any): T {
  if (!res.ok) {
    const errorMsg = data.detail 
      ? (Array.isArray(data.detail) 
          ? data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : data.detail)
      : data.message || `Error ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }
  return data;
}

// ============================================================
// SERVICIO
// ============================================================

export class FincaService {
  
  static async list(token?: string, params?: Record<string, string>): Promise<FincaOut[]> {
    let url = FINCAS_BASE;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url = `${url}?${qs}`;
    }
    console.log('🔍 list URL:', url);
    
    const res = await fetch(url, { 
      method: 'GET', 
      headers: authHeaders(token) 
    });
    
    const data = await res.json();
    console.log('📡 list Response:', data);
    return handleResponse(res, data);
  }

  static async getByUsuarioId(usuarioId: string, token?: string): Promise<FincaOut[]> {
    const url = `${FINCAS_BASE}/por-usuario/${usuarioId}`;
    console.log('🔍 getByUsuarioId URL:', url);
    
    const res = await fetch(url, { 
      method: 'GET', 
      headers: authHeaders(token) 
    });
    
    const data = await res.json();
    console.log('📡 getByUsuarioId Response:', data);
    return handleResponse(res, data);
  }

  static async getById(fincaId: string, token?: string): Promise<FincaOut> {
    const url = `${FINCAS_BASE}/${fincaId}`;
    console.log('🔍 getById URL:', url);
    
    const res = await fetch(url, { 
      method: 'GET', 
      headers: authHeaders(token) 
    });
    
    const data = await res.json();
    console.log('📡 getById Response:', data);
    return handleResponse(res, data);
  }

  /**
   * 🔥 CREAR FINCA - POST /api/v1/fincas
   * Incluye usuario_id
   */
  static async create(payload: FincaCreate, token?: string): Promise<FincaOut> {
    const url = FINCAS_BASE;
    console.log('📝 create URL:', url);
    console.log('📝 create Payload:', JSON.stringify(payload, null, 2));
    
    const res = await fetch(url, { 
      method: 'POST', 
      headers: authHeaders(token), 
      body: JSON.stringify(payload) 
    });
    
    const data = await res.json();
    console.log('📡 create Response:', data);
    return handleResponse(res, data);
  }

  /**
   * 🔥 ACTUALIZAR FINCA - PATCH /api/v1/fincas/{id}
   * SIN usuario_id
   */
  static async update(fincaId: string, payload: FincaUpdate, token?: string): Promise<FincaOut> {
    const url = `${FINCAS_BASE}/${fincaId}`;
    console.log('📝 update URL:', url);
    console.log('📝 update Payload:', JSON.stringify(payload, null, 2));
    
    const res = await fetch(url, { 
      method: 'PATCH', 
      headers: authHeaders(token), 
      body: JSON.stringify(payload) 
    });
    
    const data = await res.json();
    console.log('📡 update Response:', data);
    return handleResponse(res, data);
  }

  static async delete(fincaId: string, token?: string): Promise<{ message: string }> {
    const url = `${FINCAS_BASE}/${fincaId}`;
    console.log('🗑️ delete URL:', url);
    
    const res = await fetch(url, { 
      method: 'DELETE', 
      headers: authHeaders(token) 
    });
    
    const data = await res.json();
    console.log('📡 delete Response:', data);
    return handleResponse(res, data);
  }
static async subirDocumento(
  fincaId: string,
  tipoDocumento: string,
  archivo: File,
  token: string
): Promise<any> {
  const formData = new FormData();
  console.log('file:' + archivo.webkitRelativePath + ' type:' + tipoDocumento + ' finca_id:' + fincaId);
  
  formData.append("organizacion_inquilino", "Asociación APECAEL");
  formData.append("tipo_documento", tipoDocumento);
  formData.append("finca_id", fincaId);
  formData.append("archivo", archivo);



  const response = await fetch(`${API_URL}/api/v1/documentos/subir`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
      // No pongas Content-Type: el navegador arma el boundary del multipart solo
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || "Error al subir documento");
  }
  return await response.json();
}

static async listarDocumentos(fincaId: string, token: string): Promise<any[]> {
  const response = await fetch(`${API_URL}/api/v1/documentos/?finca_id=${fincaId}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!response.ok) {                                                                                                              
    throw new Error("Error al listar documentos");
  }
  return await response.json();
}

static async eliminarDocumento(documentoId: string, token: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/v1/documentos/${documentoId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || "Error al eliminar documento");
  }
  return await response.json().catch(() => ({}));
}
}

