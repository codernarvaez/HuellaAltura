const API_URL = "http://localhost:8000";
const AGROAMBIENTAL_BASE = `${API_URL}/api/v1/agroambiental`;

export interface VariableDinamicaCreate {
  nombre: string;
  valor: string;
  tipo_dato: string;
}

export interface VariableDinamicaOut {
  id: number;
  dato_id: string;
  nombre: string;
  valor: string;
  tipo_dato: string;
}

export interface DatoAgroambientalCreate {
  indice_shannon?: number;
  indice_simpson?: number;
  uso_suelo?: string;
  cobertura_forestal?: string;
  sistema_produccion?: string;
  biomasa_arboles?: number;
  biomasa_cafe?: number;
  hojarasca_mantillo?: number;
  carbono_organico_suelo?: number;
  total_stock_carbono?: number;
  variables?: VariableDinamicaCreate[];
}

export interface DatoAgroambientalOut extends DatoAgroambientalCreate {
  id: string;
  expediente_id: string;
  creado_en: string;
  variables: VariableDinamicaOut[];
}

export interface CarbonoResumen {
  nombre_finca: string;
  eudr_id: string;
  total_stock_carbono_tC_ha: number;
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

export class AgroambientalService {
  static async getByExpediente(expedienteId: string, token: string): Promise<DatoAgroambientalOut[]> {
    const response = await fetch(`${AGROAMBIENTAL_BASE}/${expedienteId}`, {
      method: "GET",
      headers: authHeaders(token),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al obtener datos agroambientales");
    }

    return data;
  }

  static async create(expedienteId: string, payload: DatoAgroambientalCreate, token: string): Promise<DatoAgroambientalOut> {
    const response = await fetch(`${AGROAMBIENTAL_BASE}/${expedienteId}`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al crear datos agroambientales");
    }

    return data;
  }

  static async update(expedienteId: string, datoId: string, payload: DatoAgroambientalCreate, token: string): Promise<DatoAgroambientalOut> {
    const response = await fetch(`${AGROAMBIENTAL_BASE}/${expedienteId}/${datoId}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al actualizar datos agroambientales");
    }

    return data;
  }

  static async getResumenCarbono(token: string): Promise<CarbonoResumen[]> {
    const response = await fetch(`${AGROAMBIENTAL_BASE}/resumen/carbono`, {
      method: "GET",
      headers: authHeaders(token),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al obtener resumen de carbono");
    }

    return data;
  }
}
