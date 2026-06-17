const API_URL = "https://huellaaltura.onrender.com";
const USERS_BASE = `${API_URL}/api/users`;
const AUTH_BASE = `${API_URL}/api/auth`;

export interface RoleOut {
  id: string;
  name: string;
  description?: string;
}

export interface UserOut {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role_id?: string;
  status: string;
  identifier?: string;
  phone_number?: string;
  role?: RoleOut;
  age?: number;
  gender?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserCreate {
  email: string;
  password: string;
  role_name: string;
  first_name?: string;
  last_name?: string;
  identifier?: string;
  phone_number?: string;
  edad?: number;
  genero?: string;
  status?: string;
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

export class UserService {
  static async list(token?: string): Promise<UserOut[]> {
    const response = await fetch(USERS_BASE, {
      method: "GET",
      headers: authHeaders(token),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al listar usuarios");
    }
    return data;
  }

  static async create(payload: UserCreate, token?: string): Promise<UserOut> {
    const response = await fetch(`${AUTH_BASE}/register`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al crear usuario");
    }
    return data;
  }

  static async update(userId: string, payload: Partial<UserOut>, token?: string): Promise<UserOut> {
    const response = await fetch(`${USERS_BASE}/${userId}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al actualizar el usuario");
    }
    return data;
  }
}
