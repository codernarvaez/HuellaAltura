// URLs de los backends.
// - Navegador: PUBLIC_API_URL / PUBLIC_AUTH_URL (se incrustan en el build).
// - SSR: EXPED_INTERNAL_URL / AUTH_INTERNAL_URL en runtime, para usar la red interna de Docker
//   (dentro del contenedor de hafront, "localhost" no es el backend).
// - Sin variables: en `astro dev` los contenedores locales; en build, Render.
const enServidor = (nombre: string) => (import.meta.env.SSR ? process.env[nombre] : undefined);

export const API_URL =
  enServidor("EXPED_INTERNAL_URL") ||
  import.meta.env.PUBLIC_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8001" : "https://geoguard-exped.onrender.com");

export const AUTH_URL =
  enServidor("AUTH_INTERNAL_URL") ||
  import.meta.env.PUBLIC_AUTH_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "https://huellaaltura.onrender.com");
