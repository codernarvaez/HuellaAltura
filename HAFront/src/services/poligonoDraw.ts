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

function renderPoligono(poligono: any) {
  const container = document.getElementById('finca-svg');
  if (!container) return;

  const points = poligonoToSvgPath(poligono);

  if (!points) {
    container.innerHTML = '<p class="text-label-sm text-on-surface-variant">Sin polígono disponible</p>';
    return;
  }

  const coordsArr = points.split(' ').map(p => p.split(',').map(Number));
  const centerX = coordsArr.reduce((sum, p) => sum + p[0], 0) / coordsArr.length;
  const centerY = coordsArr.reduce((sum, p) => sum + p[1], 0) / coordsArr.length;

  container.innerHTML = `
    <svg viewBox="0 0 200 200" class="w-full h-48 rounded-lg border border-outline-variant/30 overflow-hidden">
      <defs>
        <!-- Textura orgánica tipo "vegetación satelital" -->
        <filter id="terreno" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.06" numOctaves="3" seed="7" result="noise"/>
          <feColorMatrix in="noise" type="matrix"
            values="0 0 0 0 0.18
                    0 0 0 0 0.42
                    0 0 0 0 0.16
                    0 0 0 0 1" result="verde"/>
          <feComposite in="verde" in2="SourceGraphic" operator="over"/>
        </filter>

        <linearGradient id="terrenoFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a8d98a" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#2e7d32" stop-opacity="0.25"/>
        </linearGradient>

        <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
          <stop offset="60%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.25"/>
        </radialGradient>
      </defs>

      <!-- Fondo base verde oscuro -->
      <rect width="200" height="200" fill="#3a6b35"/>

      <!-- Capa de textura tipo follaje/terreno -->
      <rect width="200" height="200" filter="url(#terreno)" opacity="0.9"/>

      <!-- Algunas "manchas" orgánicas simulando vegetación/zonas distintas -->
      <ellipse cx="35" cy="40" rx="22" ry="16" fill="#5a8c3f" opacity="0.5"/>
      <ellipse cx="160" cy="150" rx="28" ry="20" fill="#2f5d2a" opacity="0.5"/>
      <ellipse cx="170" cy="35" rx="18" ry="14" fill="#4a7a35" opacity="0.4"/>
      <ellipse cx="50" cy="170" rx="20" ry="15" fill="#264d22" opacity="0.4"/>

      <!-- Marco tipo "mapa topográfico" -->
      <rect x="2" y="2" width="196" height="196" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="4 3" rx="6"/>

      <!-- Polígono de la finca (delimitación, estilo catastral) -->
      <polygon points="${points}" fill="url(#terrenoFill)" stroke="#ffe066" stroke-width="2" stroke-linejoin="round" stroke-dasharray="6 3"/>

      <!-- Marcador central -->
      <circle cx="${centerX}" cy="${centerY}" r="4" fill="#ffe066" stroke="#7a5c00" stroke-width="1"/>
      <circle cx="${centerX}" cy="${centerY}" r="8" fill="none" stroke="#ffe066" stroke-width="1" stroke-opacity="0.6">
        <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
      </circle>

      <!-- Viñeta para look de foto satelital -->
      <rect width="200" height="200" fill="url(#vignette)"/>

      <!-- Brújula -->
      <text x="8" y="194" font-size="7" fill="#fff" fill-opacity="0.8" font-family="monospace">N ↑</text>
    </svg>
  `;
}