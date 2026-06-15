//import { API_URL } from "./Api_Base";
const API_URL = "http://localhost:8000";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  email: string;
  first_name: string;
  last_name: string;
  identifier?: string;
  phone_number?: string;
  password: string;
  role_name: string;
  status?: string;
}

export interface UserOut {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: string;
  status: string;
  identifier?: string;
  phone_number?: string;
  role?: { id: string; name: string };
  created_at?: string;
  updated_at?: string;
}

//agregamos las interfaces para la recuperación de contra

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export class AuthService {
  /**
   * Inicia sesión en el backend y devuelve el token JWT
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Error al iniciar sesión");
    }

    return data;
  }

  /**
   * Registra un nuevo usuario en el backend.
   * NOTA: Actualmente el endpoint de tu backend (/api/auth/register) requiere 
   * permisos de administrador (require_manage_users). Si este registro es 
   * público, deberás crear una ruta pública en FastAPI o modificar sus dependencias.
   */
  static async register(userData: UserCreate): Promise<UserOut> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      // Manejar errores como "El email ya está registrado" (400)
      if (typeof data.detail === "string") {
        throw new Error(data.detail);
      }
      throw new Error("Error al registrar usuario");
    }

    return data;
  }

  /**
   * Obtiene la información del usuario autenticado actualmente
   */
  static async getMe(token: string): Promise<UserOut> {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Error al obtener información del usuario");
    }

    return data;
  }

  /**
   * Solicita la recuperación de contraseña
   */
  static async recoverPassword(payload: PasswordResetRequest): Promise<{message: string}> {
    const response = await fetch(`${API_URL}/api/auth/password-recovery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Error al solicitar la recuperación");
    }

    return data;
  }

  /**
   * Restablece la contraseña utilizando el token de recuperación
   */
  static async resetPassword(payload: PasswordResetConfirm): Promise<{message: string}> {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Error al restablecer la contraseña");
    }

    return data;
  }
}
