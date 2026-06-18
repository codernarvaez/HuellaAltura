import { API_URL } from "./Api_Base";
const PRODUCTORES_BASE = `${API_URL}/api/v1/productores`;

export interface ProductorCreate {
  nombre_completo: string;
  cedula_id: string;
  organizacion?: string;
  celular?: string;
  genero?: string;
  edad?: number;
}

export interface ProductorUpdate {
  nombre_completo?: string;
  organizacion?: string;
  celular?: string;
  genero?: string;
  edad?: number;
}

export interface ProductorOut extends ProductorCreate {
  id: string;
  creado_en: string;
  actualizado_en: string;
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

export class ProductorService {
  static async list(token?: string): Promise<ProductorOut[]> {
    const response = await fetch(PRODUCTORES_BASE, {
      method: "GET",
      headers: authHeaders(token),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al listar productores");
    }
    return data;
  }

  static async getById(productorId: string, token?: string): Promise<ProductorOut> {
    const response = await fetch(`${PRODUCTORES_BASE}/${productorId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al obtener productor");
    }
    return data;
  }

  static async create(payload: ProductorCreate, token?: string): Promise<ProductorOut> {
    const response = await fetch(PRODUCTORES_BASE, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al crear productor");
    }
    return data;
  }

  static async update(productorId: string, payload: ProductorUpdate, token?: string): Promise<ProductorOut> {
    const response = await fetch(`${PRODUCTORES_BASE}/${productorId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al actualizar productor");
    }
    return data;
  }

  static async delete(productorId: string, token?: string): Promise<{ message: string }> {
    const response = await fetch(`${PRODUCTORES_BASE}/${productorId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al eliminar productor");
    }
    return data;
  }
}
