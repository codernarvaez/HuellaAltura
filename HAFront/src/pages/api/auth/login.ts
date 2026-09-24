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
    const response = await AuthService.login({ email, password });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Login error:", e);
    const detail = e instanceof Error ? e.message : String(e);
    const upstream =
      /auth-service falló|schema desfasado|429|limitando peticiones|respondió 5\d\d/i.test(
        detail,
      );
    return new Response(
      JSON.stringify({
        message: upstream ? "Error del servidor de autenticación" : "Error de autenticación",
        detail,
      }),
      {
        status: upstream ? 502 : 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};