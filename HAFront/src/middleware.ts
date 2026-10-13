import { defineMiddleware } from "astro:middleware";
import type { APIContext, MiddlewareNext } from "astro";
import { AuthService } from "./services/auth.service";
import { clasificarRuta, decidirAcceso, type DecisionAcceso } from "./lib/acceso";

// Las listas de rutas públicas, compartidas y de administración y la decisión
// de acceso están en lib/acceso.ts. Aquí solo se aplican.

function aplicar(decision: DecisionAcceso, context: APIContext, next: MiddlewareNext) {
  if (decision.tipo === "redirigir") {
    if (decision.borrarCookie) {
      context.cookies.delete("token", { path: "/" });
    }
    return context.redirect(decision.destino);
  }

  if (decision.tipo === "prohibido") {
    // 403: usuario autenticado pero sin permisos suficientes.
    return new Response("No tienes permisos para acceder a esta sección.", {
      status: 403,
    });
  }

  return next();
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const token = context.cookies.get("token")?.value;

  // Ruta pública o sin token: se decide sin consultar getMe. No basta con
  // mirar la primera decisión: en una ruta admin con token, sin rol todavía,
  // saldría "prohibido" antes de saber quién es el usuario.
  if (clasificarRuta(pathname) === "publica" || !token) {
    return aplicar(decidirAcceso({ pathname, token }), context, next);
  }

  let user;

  try {
    user = await AuthService.getMe(token);
    context.locals.user = user;
  } catch (error) {
    return aplicar(decidirAcceso({ pathname, token, sesionValida: false }), context, next);
  }

  return aplicar(
    decidirAcceso({ pathname, token, sesionValida: true, rol: user?.role?.name }),
    context,
    next,
  );
});
