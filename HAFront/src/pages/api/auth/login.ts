import type { APIRoute } from "astro";
import { AuthService } from "../../../services/auth.service";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const text = await request.text();
    if (!text) {
      return new Response(JSON.stringify({ message: "Body vacío" }), { status: 400 });
    }

    const { email, password } = JSON.parse(text);
    const forwarded = request.headers.get("x-forwarded-for");
    const clientIp =
      (forwarded ? forwarded.split(",")[0]?.trim() : "") ||
      request.headers.get("x-real-ip")?.trim() ||
      undefined;
    const response = await AuthService.login({ email, password }, { clientIp });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Login error:", e);
    const detail = e instanceof Error ? e.message : String(e);
    const rateLimited = /429|limitando peticiones|rate limit|too many requests/i.test(detail);
    const upstream =
      rateLimited ||
      /auth-service falló|schema desfasado|respondió 5\d\d/i.test(detail);
    return new Response(
      JSON.stringify({
        message: rateLimited
          ? "Demasiados intentos de acceso"
          : upstream
            ? "Error del servidor de autenticación"
            : "Error de autenticación",
        detail,
      }),
      {
        status: rateLimited ? 429 : upstream ? 502 : 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};