import { isAdminRole } from "../services/roles.ts";

// Reglas de acceso por ruta que aplica middleware.ts. Viven aquí, sin
// dependencias de Astro, para poder probarlas de forma aislada.

export const LOGIN_PATH = "/acceso";

// Rutas que NO requieren sesión (todo lo demás se considera privado).
export const PUBLIC_PATHS = [
  "/",
  "/acceso",
  "/legal/terminos",
  "/legal/privacidad",
  "/legal/cookies",
];

// Prefijos que tampoco deben pasar por el chequeo de sesión
// (endpoints de auth propios de Astro, assets estáticos, etc.)
export const PUBLIC_PREFIXES = [
  "/api/auth",
  "/_astro",
  "/favicon",
];

// Secciones públicas que se comparan por segmento completo, para que
// "/verificar" no abra también "/verificarX".
// /verificar es la consulta del consumidor por QR (HU-07).
export const PUBLIC_SECTIONS = [
  "/verificar",
];

// Prefijos exclusivos para administradores (ADMIN, ADMINISTRADOR, SUPER_ADMIN).
// Cualquier ruta que empiece con uno de estos prefijos exige isAdminRole === true.
export const ADMIN_PREFIXES = [
  "/user",
  "/rol",
  "/variableDynamic",
];

// Rutas compartidas: requieren sesión pero NO son admin-only.
// (No es obligatorio mantener esta lista, pero ayuda a documentar
// explícitamente qué se considera "para todos los autenticados".)
// En /trazabilidad el rol de la app solo decide el menú; el permiso real de
// cada acción lo da el contrato (hasRole) dentro de la vista.
export const SHARED_PREFIXES = [
  "/productorFinca",
  "/expedientes",
  "/satelital",
  "/informacion-agroambiental",
  "/trazabilidad",
  "/soporte",
  "/logout",
];

export type TipoRuta = "publica" | "admin" | "privada";

export type DecisionAcceso =
  | { tipo: "continuar" }
  | { tipo: "redirigir"; destino: string; borrarCookie: boolean }
  | { tipo: "prohibido" };

export interface ContextoAcceso {
  pathname: string;
  token?: string | null;
  /** undefined: todavía no se consultó getMe. */
  sesionValida?: boolean;
  rol?: string | null;
}

/** true si pathname es la sección o una ruta dentro de ella. */
export function estaEnSeccion(pathname: string, seccion: string): boolean {
  return pathname === seccion || pathname.startsWith(`${seccion}/`);
}

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_SECTIONS.some((seccion) => estaEnSeccion(pathname, seccion))) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function clasificarRuta(pathname: string): TipoRuta {
  if (isPublicPath(pathname)) return "publica";
  if (isAdminOnlyPath(pathname)) return "admin";
  return "privada";
}

/**
 * Decide qué hacer con una petición. El middleware la llama primero sin
 * sesionValida (para no consultar getMe en rutas públicas o sin token) y
 * otra vez con el resultado de getMe.
 */
export function decidirAcceso(ctx: ContextoAcceso): DecisionAcceso {
  const tipo = clasificarRuta(ctx.pathname);

  if (tipo === "publica") return { tipo: "continuar" };
  if (!ctx.token) return { tipo: "redirigir", destino: LOGIN_PATH, borrarCookie: false };
  // Token inválido o expirado: se borra la cookie y se manda a login.
  if (ctx.sesionValida === false) return { tipo: "redirigir", destino: LOGIN_PATH, borrarCookie: true };
  if (tipo === "admin" && !isAdminRole(ctx.rol)) return { tipo: "prohibido" };

  return { tipo: "continuar" };
}
