import { API_URL } from "./Api_Base";
const FINCAS_BASE = `${API_URL}/api/v1/fincas`;

export interface FincaCreate {
  productor_id: string;
  nombre: string;
  provincia?: string;
  canton?: string;
  parroquia?: string;
  barrio?: string;
  area_total_ha?: number;
  area_cultivada_ha?: number;
  tenencia?: string;
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
  static async list(token?: string, params?: Record<string, string>) : Promise<FincaOut[]> {
    let url = FINCAS_BASE;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url = `${url}?${qs}`;
    }
    const res = await fetch(url, { method: 'GET', headers: authHeaders(token) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al listar fincas');
    return data;
  }

  static async getById(fincaId: string, token?: string): Promise<FincaOut> {
    const res = await fetch(`${FINCAS_BASE}/${fincaId}`, { method: 'GET', headers: authHeaders(token) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al obtener finca');
    return data;
  }

  static async create(payload: FincaCreate, token?: string): Promise<FincaOut> {
    const res = await fetch(FINCAS_BASE, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al crear finca');
    return data;
  }

  static async update(fincaId: string, payload: FincaUpdate, token?: string): Promise<FincaOut> {
    const res = await fetch(`${FINCAS_BASE}/${fincaId}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al actualizar finca');
    return data;
  }

  static async delete(fincaId: string, token?: string): Promise<{message:string}> {
    const res = await fetch(`${FINCAS_BASE}/${fincaId}`, { method: 'DELETE', headers: authHeaders(token) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al eliminar finca');
    return data;
  }
}
