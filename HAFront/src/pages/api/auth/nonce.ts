import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const nonce = crypto.randomUUID();
  cookies.set("siwe-nonce", nonce, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });

  return new Response(JSON.stringify({ nonce }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
