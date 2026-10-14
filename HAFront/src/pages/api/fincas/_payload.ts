import { clean } from "../_proxy";

// El formulario de productorFinca usa nombres distintos a los del exped-service.
const TENENCIA: Record<string, string> = { PROPIA: "PROPIA", POSESION: "POSESION", ARRENDADA: "ARRENDAMIENTO" };

export function fincaPayload(body: Record<string, unknown>) {
  return clean({
    nombre: body.nombre,
    usuario_id: body.usuario_id,
    provincia: body.provincia,
    canton: body.canton,
    parroquia: body.parroquia,
    sector: body.sector ?? body.barrio,
    area_total_ha: body.area_total_ha || undefined,
    area_cultivada_ha: body.area_cultivada_ha || undefined,
    tenencia: typeof body.tenencia === "string" ? TENENCIA[body.tenencia] : undefined,
  });
}
