// src/services/InfoAgroambiental.ts
import { API_URL } from "./Api_Base";

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
  finca_id?: string;
  variables?: VariableDinamicaCreate[];
}

export interface DatoAgroambientalOut extends DatoAgroambientalCreate {
  id: string;
  finca_id: string;
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
  /**
   * Obtiene todos los registros agroambientales de una finca
   * GET /api/v1/agroambiental/{finca_id}
   */
  static async getByFinca(fincaId: string, token?: string): Promise<DatoAgroambientalOut[]> {
    const response = await fetch(`${AGROAMBIENTAL_BASE}/${fincaId}`, {
      method: "GET",
      headers: authHeaders(token),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al obtener datos agroambientales");
    }

    return data;
  }

  /**
   * Crea un nuevo registro agroambiental para una finca
   * POST /api/v1/agroambiental/
   * Body: DatoAgroambientalCreate (incluye finca_id)
   */
  static async create(payload: DatoAgroambientalCreate, token?: string): Promise<DatoAgroambientalOut> {
    const response = await fetch(AGROAMBIENTAL_BASE, {
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

  /**
   * Actualiza un registro agroambiental existente
   * PATCH /api/v1/agroambiental/{dato_id}
   * Body: DatoAgroambientalCreate (sin finca_id ni variables)
   */
  static async update(
    datoId: string, 
    payload: Partial<DatoAgroambientalCreate>, 
    token?: string
  ): Promise<DatoAgroambientalOut> {
    const response = await fetch(`${AGROAMBIENTAL_BASE}/${datoId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al actualizar datos agroambientales");
    }

    return data;
  }

  /**
   * Obtiene un resumen del stock de carbono por finca
   * GET /api/v1/agroambiental/resumen/carbono
   */
  static async getResumenCarbono(token?: string): Promise<CarbonoResumen[]> {
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