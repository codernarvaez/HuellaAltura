import { defineMiddleware } from "astro:middleware";
import { AuthService } from "./services/auth.service";
import { isAdminRole } from "./lib/roles";

// Rutas que NO requieren sesión (todo lo demás se considera privado).
const PUBLIC_PATHS = [
  "/",
  "/acceso",
  "/legal/terminos",
  "/legal/privacidad",
  "/legal/cookies",
];

// Prefijos que tampoco deben pasar por el chequeo de sesión
// (endpoints de auth propios de Astro, assets estáticos, etc.)
const PUBLIC_PREFIXES = [
  "/api/auth",
  "/_astro",
  "/favicon",
];

// Prefijos exclusivos para administradores (ADMIN, ADMINISTRADOR, SUPER_ADMIN).
// Cualquier ruta que empiece con uno de estos prefijos exige isAdminRole === true.
const ADMIN_PREFIXES = [
  "/user",
  "/rol",
  "/variableDynamic",
];

// Rutas compartidas: requieren sesión pero NO son admin-only.
// (No es obligatorio mantener esta lista, pero ayuda a documentar
// explícitamente qué se considera "para todos los autenticados".)
const SHARED_PREFIXES = [
  "/productorFinca",
  "/expedientes",
  "/satelital",
  "/informacion-agroambiental",
  "/soporte",
  "/logout",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (isPublicPath(pathname)) {
    return next();
  }

  const token = context.cookies.get("token")?.value;

  if (!token) {
    return context.redirect("/acceso");
  }

  let user;

  try {
    user = await AuthService.getMe(token);
    context.locals.user = user;
  } catch (error) {
    // Token inválido o expirado: limpiamos la cookie y mandamos a login.
    context.cookies.delete("token", { path: "/" });
    return context.redirect("/acceso");
  }

  // Control de acceso por rol: si la ruta es admin-only y el usuario
  // no tiene un rol admin, no le dejamos pasar.
  if (isAdminOnlyPath(pathname) && !isAdminRole(user?.role?.name)) {
    // 403: usuario autenticado pero sin permisos suficientes.
    // Puedes cambiar esto por una redirección a una página de "Acceso denegado"
    // si prefieres no usar Response directamente, ej: return context.redirect("/403");
    return new Response("No tienes permisos para acceder a esta sección.", {
      status: 403,
    });
  }

  return next();
});