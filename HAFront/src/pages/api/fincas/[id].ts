import type { APIRoute } from "astro";
import { API_URL } from "../../../services/Api_Base";
import { getToken, json, relay } from "../_proxy";
import { fincaPayload } from "./_payload";

export const prerender = false;

// Edición de finca desde productorFinca → exped-service (PATCH /api/v1/fincas/{id}).
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const token = getToken(request, cookies);
  if (!token) return json({ message: "Sesión no válida" }, 401);
  try {
    const res = await fetch(`${API_URL}/api/v1/fincas/${encodeURIComponent(params.id ?? "")}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(fincaPayload(await request.json())),
    });
    return relay(res);
  } catch (e) {
    console.error("Error al actualizar finca:", e);
    return json({ message: "No se pudo conectar con el servicio de fincas" }, 502);
  }
};
