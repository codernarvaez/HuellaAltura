// En el servidor (SSR, middleware, /api/*) se usan las URLs internas si existen: dentro de
// Docker "localhost" apunta al propio contenedor de HAFront. En el navegador, las PUBLIC_*.
const serverUrl = (name: string): string | undefined =>
  import.meta.env.SSR ? process.env[name] : undefined;

export const API_URL =
  serverUrl("INTERNAL_API_URL") || import.meta.env.PUBLIC_API_URL || "https://geoguard-exped.onrender.com";
export const AUTH_URL =
  serverUrl("INTERNAL_AUTH_URL") || import.meta.env.PUBLIC_AUTH_URL || "https://huellaaltura.onrender.com";
