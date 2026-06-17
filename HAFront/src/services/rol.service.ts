const API_URL = "https://huellaaltura.onrender.com";
const ROLES_BASE = `${API_URL}/api/roles`;

export interface RoleOut {
  id: string;
  name: string;
  description?: string;
}

export interface RoleCreate {
  name: string;
  description?: string;
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

export class RoleService {
  static async list(token?: string): Promise<RoleOut[]> {
    const response = await fetch(ROLES_BASE, {
      method: "GET",
      headers: authHeaders(token),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al listar roles");
    }
    return data;
  }

  static async create(payload: RoleCreate, token?: string): Promise<RoleOut> {
    const response = await fetch(ROLES_BASE, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al crear rol");
    }
    return data;
  }

  static async update(roleId: string, payload: RoleCreate, token?: string): Promise<RoleOut> {
    const response = await fetch(`${ROLES_BASE}/${roleId}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al actualizar rol");
    }
    return data;
  }

  static async delete(roleId: string, token?: string): Promise<void> {
    const response = await fetch(`${ROLES_BASE}/${roleId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || "Error al eliminar rol");
    }
  }
}
