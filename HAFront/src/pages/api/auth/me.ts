import type { APIRoute } from "astro";
import { AuthService } from "../../../services/auth.service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get("token")?.value;

  if (!token) {
    return new Response(JSON.stringify({ detail: "No autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const user = await AuthService.getMe(token);
    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ detail: error instanceof Error ? error.message : "Error al obtener perfil" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
};