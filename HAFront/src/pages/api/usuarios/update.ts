import type { APIRoute } from "astro";
import { AUTH_URL } from "../../../services/Api_Base";
import { AuthService } from "../../../services/auth.service";
import { clean, getToken, json, relay } from "../_proxy";

export const prerender = false;

// Guardado de "Información del Productor" (productorFinca): actualiza al usuario de la sesión
// en auth-service (PATCH /api/users/{id}).
export const PUT: APIRoute = async ({ request, cookies }) => {
  const token = getToken(request, cookies);
  if (!token) return json({ message: "Sesión no válida" }, 401);
  try {
    const me = await AuthService.getMe(token);
    const body = await request.json();
    const payload = clean({
      first_name: body.first_name,
      last_name: body.last_name,
      identifier: body.identifier,
      phone_number: body.phone_number,
      edad: body.edad,
      // El backend usa MASCULINO/FEMENINO/OTRO; el formulario envía "Masculino"…
      genero: typeof body.genero === "string" ? body.genero.toUpperCase() : undefined,
    });
    const res = await fetch(`${AUTH_URL}/api/users/${me.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return relay(res);
  } catch (e) {
    console.error("Error al actualizar productor:", e);
    return json({ message: "No se pudo conectar con el servicio de usuarios" }, 502);
  }
};
