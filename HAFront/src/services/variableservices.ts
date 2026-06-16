const API_URL = "http://127.0.0.1:8031";
const VARIABLES_BASE = `${API_URL}/api/v1/variables`;

export interface VariableDinamicaCreate {
  nombre: string;
  valor: string;
  tipo_dato: string;
}

export interface VariableDinamicaUpdate {
  nombre?: string;
  valor?: string;
  tipo_dato?: string;
}

export interface VariableDinamicaOut {
  id: number;
  dato_id: string;
  nombre: string;
  valor: string;
  tipo_dato: string;
}

function authHeaders(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export class VariableService {
  static async list(datoId: string, token: string): Promise<VariableDinamicaOut[]> {
    const response = await fetch(`${VARIABLES_BASE}/${datoId}`, {
      method: "GET",
      headers: authHeaders(token),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al listar variables dinámicas");
    }

    return data;
  }

  static async create(datoId: string, payload: VariableDinamicaCreate, token: string): Promise<VariableDinamicaOut> {
    const response = await fetch(`${VARIABLES_BASE}/${datoId}`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al crear variable dinámica");
    }

    return data;
  }

  static async update(datoId: string, variableId: number, payload: VariableDinamicaUpdate, token: string): Promise<VariableDinamicaOut> {
    const response = await fetch(`${VARIABLES_BASE}/${datoId}/${variableId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al actualizar variable dinámica");
    }

    return data;
  }

  static async delete(datoId: string, variableId: number, token: string): Promise<{ message: string }> {
    const response = await fetch(`${VARIABLES_BASE}/${datoId}/${variableId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al eliminar variable dinámica");
    }

    return data;
  }
}
