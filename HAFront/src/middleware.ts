import { defineMiddleware } from "astro:middleware";
import { AuthService } from "./services/auth.service";
import { isAdminRole } from "./services/roles";
import {
  getProductorProgress,
  pasosPreviosCompletos,
  primerPasoIncompleto,
  urlForStep,
  STEP_ORDER,
  type StepKey,
} from "./services/productorProgress";

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
  "/infoAgro",
  "/informacion-agroambiental",
  "/soporte",
  "/logout",
];

// 🔥 Prefijos que corresponden a cada paso del wizard del PRODUCTOR.
// Deben coincidir con las URLs reales usadas en LayoutVariable.astro.
const STEP_PREFIXES: Record<StepKey, string[]> = {
  finca: ["/productorFinca"],
  agroambiental: ["/infoAgro", "/informacion-agroambiental"],
  satelital: ["/satelital"],
  expediente: ["/expedientes"],
};

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Determina a qué paso del wizard pertenece la ruta solicitada (si aplica). */
function matchStep(pathname: string): StepKey | null {
  for (const step of STEP_ORDER) {
    if (STEP_PREFIXES[step].some((prefix) => pathname.startsWith(prefix))) {
      return step;
    }
  }
  return null;
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
    return new Response("No tienes permisos para acceder a esta sección.", {
      status: 403,
    });
  }

  // 🔥 CONTROL DE FLUJO SECUENCIAL PARA EL PRODUCTOR
  // (Investigador, Auditor Interno y Admin no pasan por este flujo).
  const rolNombre = user?.role?.name;
  const esProductor = rolNombre === "PRODUCTOR"; // ⚠️ ajusta si tu rol usa otro nombre exacto

  if (esProductor && user?.id) {
    const step = matchStep(pathname);

    // Solo bloqueamos si la ruta pertenece a un paso que NO es el primero;
    // el primer paso (Productor y Finca) siempre está disponible.
    if (step && step !== STEP_ORDER[0]) {
  const progress = await getProductorProgress(user.id, token);

  // 🔍 DEBUG TEMPORAL: para ver exactamente qué está evaluando el middleware
  console.log("🧭 [middleware] pathname:", pathname, "step:", step, "progress:", progress);

  if (!pasosPreviosCompletos(step, progress)) {
    const pasoBloqueante = primerPasoIncompleto(progress) ?? STEP_ORDER[0];
    console.log("🚫 [middleware] Bloqueando por paso:", pasoBloqueante, "progress completo:", progress);
    const destino = urlForStep(pasoBloqueante, progress.fincaId);

    const redirectUrl = new URL(destino, context.url.origin);
    redirectUrl.searchParams.set("bloqueado", step);

    return context.redirect(redirectUrl.pathname + redirectUrl.search);
  }
}
  }

  return next();
});