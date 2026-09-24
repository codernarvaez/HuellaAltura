import { AUTH_API_URL as API_URL } from "./Api_Base";

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
  organizacion?: string;
  genero?: string;
  edad?: number;
  nivel_educativo?: string;
  role?: { id: string; name: string };
  user_metadata?: {
    full_name?: string;
    auth_provider?: string;
    wallet_address?: string;
  };
  created_at?: string;
  updated_at?: string;
}

//agregamos las interfaces para la recuperación de contraaaseña 

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

    const raw = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      if (response.status === 429 || /too many requests/i.test(raw)) {
        throw new Error(
          "El servidor o la base de datos están limitando peticiones (429). Espera 30–60 s e inténtalo de nuevo.",
        );
      }
      if (response.status >= 500 || /internal\s*server\s*error/i.test(raw)) {
        throw new Error(
          "auth-service falló al consultar la base (posible schema desfasado). Revisa DATABASE_URL y prisma db push.",
        );
      }
      throw new Error(
        raw?.trim()
          ? `auth-service respondió ${response.status}: ${raw.trim().slice(0, 180)}`
          : `auth-service respondió ${response.status} sin cuerpo`,
      );
    }

    if (!response.ok) {
      const detail = data.detail;
      if (typeof detail === "string") {
        throw new Error(detail);
      } else if (Array.isArray(detail)) {
        const msgs = detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(", ");
        throw new Error(`Datos inválidos: ${msgs}`);
      }
      throw new Error(
        (typeof detail === "string" ? detail : JSON.stringify(detail)) || "Error al iniciar sesión",
      );
    }

    return data as unknown as LoginResponse;
  }

  static async loginWithFirebase(idToken: string): Promise<LoginResponse> {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/auth/firebase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
    } catch {
      throw new Error(
        `auth-service no responde en ${API_URL}. Revisa HABack/auth-service/.env (DATABASE_URL, SECRET_KEY) y que el proceso esté en el puerto 8000.`,
      );
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.detail;
      throw new Error(typeof detail === "string" ? detail : "No se pudo validar la sesión de Firebase");
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
   * Obtiene un usuario por ID (vía listado de gestores; no hay GET /users/{id}).
   */
  static async getById(userId: string, token: string): Promise<UserOut> {
    const response = await fetch(`${API_URL}/api/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error al obtener usuario");
    }

    const user = (data as UserOut[]).find((u) => u.id === userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }
    return user;
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
