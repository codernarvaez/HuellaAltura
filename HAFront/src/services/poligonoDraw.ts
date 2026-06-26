// elimina el import de "any" - no existe, es un tipo nativo de TS

export function poligonoToSvgPath(poligono: any, width = 200, height = 200, padding = 10): string | null {
  if (!poligono || !poligono.coordinates || !poligono.coordinates[0]) {
    return null;
  }

  const coords = poligono.coordinates[0];
  const lngs = coords.map((c: any) => c[0]);
  const lats = coords.map((c: any) => c[1]);

  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const rangeLng = maxLng - minLng || 1;
  const rangeLat = maxLat - minLat || 1;

  const scaleX = (width - padding * 2) / rangeLng;
  const scaleY = (height - padding * 2) / rangeLat;

  const points = coords.map(([lng, lat]: [any, any]) => {
    const x = padding + (lng - minLng) * scaleX;
    const y = height - padding - (lat - minLat) * scaleY;
    return `${x},${y}`;
  });

  return points.join(' ');
}

// Esta función ahora recibe el id del contenedor, para que sirva
// con cualquier <div> (en tu caso "finca-svg")
export function renderPoligono(poligono: any, containerId = 'finca-svg') {
  const points = poligonoToSvgPath(poligono);
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`No se encontró el contenedor #${containerId} para renderizar el polígono`);
    return;
  }

  if (!points) {
    container.innerHTML = '<p class="text-label-sm text-on-surface-variant">Sin polígono disponible</p>';
    return;
  }

  container.innerHTML = `
    <svg viewBox="0 0 200 200" class="w-full h-40 bg-surface-container-low rounded-lg border border-outline-variant/30">
      <polygon points="${points}" fill="#2e7d32" fill-opacity="0.3" stroke="#2e7d32" stroke-width="2" />
    </svg>
  `;
}