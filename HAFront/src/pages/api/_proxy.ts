import type { AstroCookies } from "astro";

// Utilidades de los endpoints /api/usuarios y /api/fincas, que reenvían al backend desde el
// servidor de Astro (URLs internas de Api_Base) y devuelven siempre JSON con `message`.

export function getToken(request: Request, cookies: AstroCookies): string | undefined {
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return bearer && bearer !== "null" ? bearer : cookies.get("token")?.value;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Quita strings vacíos y null para no pisar datos con valores en blanco. */
export function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== null && v !== undefined)) as Partial<T>;
}

/** Reenvía la respuesta del backend; los errores de FastAPI (`detail`) pasan a `message`. */
export async function relay(res: Response): Promise<Response> {
  const data = await res.json().catch(() => ({}));
  if (res.ok) return json(data, res.status);
  const detail = (data as { detail?: unknown }).detail;
  const message =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: { loc?: unknown[]; msg?: string }) => `${(d.loc ?? []).slice(-1)[0]}: ${d.msg}`).join("; ")
        : `Error ${res.status}`;
  return json({ message, detail }, res.status);
}
