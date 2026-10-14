import type { APIRoute } from "astro";
import { API_URL } from "../../../services/Api_Base";
import { getToken, json, relay } from "../_proxy";
import { fincaPayload } from "./_payload";

export const prerender = false;

// Alta de finca desde productorFinca → exped-service (POST /api/v1/fincas/).
export const POST: APIRoute = async ({ request, cookies }) => {
  const token = getToken(request, cookies);
  if (!token) return json({ message: "Sesión no válida" }, 401);
  try {
    const res = await fetch(`${API_URL}/api/v1/fincas/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(fincaPayload(await request.json())),
    });
    return relay(res);
  } catch (e) {
    console.error("Error al crear finca:", e);
    return json({ message: "No se pudo conectar con el servicio de fincas" }, 502);
  }
};
