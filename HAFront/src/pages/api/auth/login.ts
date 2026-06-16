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
    return new Response(JSON.stringify({ message: "Error de autenticación" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
};