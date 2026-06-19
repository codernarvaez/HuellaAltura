import { API_URL } from "./Api_Base";
const EXPEDIENTES_BASE = `${API_URL}/api/v1/expedientes`;

export interface ExpedienteOut {
  id: string;
  productor_id?: string;
  finca_id?: string;
  creado_en?: string;
  actualizado_en?: string;
}

function authHeaders(token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export class ExpedienteService {
  static async list(token?: string, params?: Record<string, string>) : Promise<ExpedienteOut[]> {
    let url = EXPEDIENTES_BASE;
    if (params) url = `${url}?${new URLSearchParams(params).toString()}`;
    const res = await fetch(url, { method: 'GET', headers: authHeaders(token) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al listar expedientes');
    return data;
  }

  static async getById(id: string, token?: string) {
    const res = await fetch(`${EXPEDIENTES_BASE}/${id}`, { method: 'GET', headers: authHeaders(token) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al obtener expediente');
    return data;
  }
}
