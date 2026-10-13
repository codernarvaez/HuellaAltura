import { BASE_TRAZABILIDAD } from "./rutas.ts";

/**
 * Respuesta 404 de las rutas del módulo con un id de lote o una fase que no
 * existen. El proyecto no tiene página 404 propia, así que se devuelve un HTML
 * mínimo con enlace de vuelta al panel en lugar de un error 500.
 */
export function respuestaNoEncontrado(): Response {
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Lote no encontrado · Huella de Altura</title></head>
<body style="font-family: system-ui, sans-serif; padding: 2rem;">
  <h1>Lote no encontrado</h1>
  <p>La dirección no corresponde a un lote ni a una fase del módulo de trazabilidad.</p>
  <p><a href="${BASE_TRAZABILIDAD}">Volver al panel de lotes</a></p>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
