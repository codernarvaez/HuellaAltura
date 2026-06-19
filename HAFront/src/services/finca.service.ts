import { API_URL } from "./Api_Base";
const FINCAS_BASE = `${API_URL}/api/v1/fincas`;

export interface FincaCreate {
  usuario_id: string;
  nombre: string;
  provincia?: string;
  canton?: string;
  parroquia?: string;
  barrio?: string;
  area_total_ha?: number;
  area_cultivada_ha?: number;
  tenencia?: string;
  poligono?: any;
}

export interface FincaUpdate {
  nombre?: string;
  provincia?: string;
  canton?: string;
  parroquia?: string;
  barrio?: string;
  area_total_ha?: number;
  area_cultivada_ha?: number;
  tenencia?: string;
  poligono?: any;
}

export interface FincaOut extends FincaCreate {
  id: string;
  eudr_id?: string;
  creado_en?: string;
  actualizado_en?: string;
}

function authHeaders(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export class FincaService {
  static async list(token?: string, params?: Record<string, string>): Promise<FincaOut[]> {
    let url = FINCAS_BASE;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url = `${url}?${qs}`;
    }
    const res = await fetch(url, { method: 'GET', headers: authHeaders(token) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Error al listar fincas');
    }
    const data = await res.json();
    return data;
  }

  static async getByUsuarioId(usuarioId: string, token?: string): Promise<FincaOut[]> {
    const url = `${FINCAS_BASE}/por-usuario/${usuarioId}`;
    console.log('🔍 getByUsuarioId URL:', url);
    
    const res = await fetch(url, { 
      method: 'GET', 
      headers: authHeaders(token) 
    });
    
    console.log('🔍 getByUsuarioId Status:', res.status);
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('❌ Error response:', data);
      throw new Error(data.detail || 'Error al obtener fincas por usuario');
    }
    
    const data = await res.json();
    console.log('✅ getByUsuarioId Data:', data);
    return data;
  }

  static async getById(fincaId: string, token?: string): Promise<FincaOut> {
    const url = `${FINCAS_BASE}/${fincaId}`;
    console.log('🔍 getById URL:', url);
    
    const res = await fetch(url, { method: 'GET', headers: authHeaders(token) });
    console.log('🔍 getById Status:', res.status);
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('❌ Error response:', data);
      throw new Error(data.detail || 'Error al obtener finca');
    }
    const data = await res.json();
    console.log('✅ getById Data:', data);
    return data;
  }

  static async create(payload: FincaCreate, token?: string): Promise<FincaOut> {
    const url = FINCAS_BASE;
    console.log('🔍 create URL:', url);
    console.log('🔍 create Payload:', payload);
    
    const res = await fetch(url, { 
      method: 'POST', 
      headers: authHeaders(token), 
      body: JSON.stringify(payload) 
    });
    
    console.log('🔍 create Status:', res.status);
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('❌ Error response:', data);
      throw new Error(data.detail || 'Error al crear finca');
    }
    const data = await res.json();
    console.log('✅ create Data:', data);
    return data;
  }

  static async update(fincaId: string, payload: FincaUpdate, token?: string): Promise<FincaOut> {
    const url = `${FINCAS_BASE}/${fincaId}`;
    console.log('🔍 update URL:', url);
    console.log('🔍 update Payload:', payload);
    
    const res = await fetch(url, { 
      method: 'PATCH', 
      headers: authHeaders(token), 
      body: JSON.stringify(payload) 
    });
    
    console.log('🔍 update Status:', res.status);
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('❌ Error response:', data);
      throw new Error(data.detail || 'Error al actualizar finca');
    }
    const data = await res.json();
    console.log('✅ update Data:', data);
    return data;
  }

  static async delete(fincaId: string, token?: string): Promise<{message:string}> {
    const url = `${FINCAS_BASE}/${fincaId}`;
    console.log('🔍 delete URL:', url);
    
    const res = await fetch(url, { 
      method: 'DELETE', 
      headers: authHeaders(token) 
    });
    
    console.log('🔍 delete Status:', res.status);
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('❌ Error response:', data);
      throw new Error(data.detail || 'Error al eliminar finca');
    }
    const data = await res.json();
    console.log('✅ delete Data:', data);
    return data;
  }
}