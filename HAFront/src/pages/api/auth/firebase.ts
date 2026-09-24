import type { APIRoute } from "astro";
import { AuthService } from "../../../services/auth.service";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const text = await request.text();
    if (!text) {
      return new Response(JSON.stringify({ message: "Body vacío" }), { status: 400 });
    }

    const { id_token: idToken } = JSON.parse(text);
    if (!idToken || typeof idToken !== "string") {
      return new Response(JSON.stringify({ detail: "Falta el ID token de Firebase" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await AuthService.loginWithFirebase(idToken);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: "Error de autenticación",
        detail: error instanceof Error ? error.message : String(error),
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
};
