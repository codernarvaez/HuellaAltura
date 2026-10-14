/**
 * Mapa Mapbox satelital + polígono de finca (fase 1).
 * Requiere window.mapboxgl (CDN) y window.__SATELITAL_MAP__.
 */

type LngLat = { lng: number; lat: number };

type GeoPolygon = {
  type: string;
  coordinates?: unknown;
  geometry?: { type: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
};

type SatelitalMapConfig = {
  token: string;
  poligono: GeoPolygon | null;
  centro: LngLat | null;
  nombre: string;
};

type MapboxGl = {
  accessToken: string;
  Map: new (opts: Record<string, unknown>) => MapboxMap;
  NavigationControl: new (opts?: Record<string, unknown>) => unknown;
  Marker: new (opts?: Record<string, unknown>) => {
    setLngLat: (ll: [number, number]) => { addTo: (m: MapboxMap) => unknown };
  };
};

type MapboxMap = {
  on: (event: string, cb: () => void) => void;
  addControl: (control: unknown, position?: string) => void;
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>) => void;
  fitBounds: (bounds: [[number, number], [number, number]], opts?: Record<string, unknown>) => void;
  flyTo: (opts: Record<string, unknown>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resize: () => void;
  remove: () => void;
};

function getConfig(): SatelitalMapConfig | undefined {
  return window.__SATELITAL_MAP__ as SatelitalMapConfig | undefined;
}

function getMapbox(): MapboxGl | undefined {
  return window.mapboxgl as MapboxGl | undefined;
}

function asFeatureCollection(poligono: GeoPolygon | null): Record<string, unknown> | null {
  if (!poligono) return null;

  if (poligono.type === "Feature") {
    return { type: "FeatureCollection", features: [poligono] };
  }

  if (poligono.type === "Polygon" || poligono.type === "MultiPolygon") {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: poligono }],
    };
  }

  return null;
}

function boundsFromCoords(coords: number[][]): [[number, number], [number, number]] | null {
  if (!coords.length) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const pair of coords) {
    const lng = pair[0];
    const lat = pair[1];
    if (typeof lng !== "number" || typeof lat !== "number") continue;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function ringCoords(poligono: GeoPolygon | null): number[][] {
  if (!poligono) return [];
  const geom = poligono.type === "Feature" ? poligono.geometry : poligono;
  if (!geom?.coordinates) return [];
  if (geom.type === "Polygon") {
    const rings = geom.coordinates as number[][][];
    return rings[0] || [];
  }
  if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates as number[][][][];
    return polys[0]?.[0] || [];
  }
  return [];
}

function showMapMessage(el: HTMLElement | null, text: string) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
}

export function initSatelitalMap(): void {
  const cfg = getConfig();
  const container = document.getElementById("satelital-map");
  const statusEl = document.getElementById("satelital-map-status");
  const zoomInBtn = document.getElementById("satelital-zoom-in");
  const zoomOutBtn = document.getElementById("satelital-zoom-out");
  const fitBtn = document.getElementById("satelital-fit-bounds");

  if (!container) return;

  if (!cfg?.token) {
    showMapMessage(
      statusEl,
      "Falta PUBLIC_MAPBOX_ACCESS_TOKEN. Configúralo en HAFront/.env y en Render (WS-HA).",
    );
    return;
  }

  const mapboxgl = getMapbox();
  if (!mapboxgl) {
    showMapMessage(statusEl, "No se pudo cargar Mapbox GL. Revisa la red o el bloqueo de scripts.");
    return;
  }

  const prev = (window as Window & { __SATELITAL_MAP_INSTANCE__?: MapboxMap })
    .__SATELITAL_MAP_INSTANCE__;
  if (prev) {
    try {
      prev.remove();
    } catch {
      /* ignore */
    }
  }

  mapboxgl.accessToken = cfg.token;

  const fallbackCenter: [number, number] = cfg.centro
    ? [cfg.centro.lng, cfg.centro.lat]
    : [-79.2, -3.99];

  const map = new mapboxgl.Map({
    container,
    style: "mapbox://styles/mapbox/satellite-streets-v12",
    center: fallbackCenter,
    zoom: cfg.poligono ? 15 : 12,
    attributionControl: true,
  });

  (window as Window & { __SATELITAL_MAP_INSTANCE__?: MapboxMap }).__SATELITAL_MAP_INSTANCE__ =
    map;

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

  map.on("load", () => {
    statusEl?.classList.add("hidden");

    const poligono = (cfg.poligono as GeoPolygon | null) ?? null;
    const fc = asFeatureCollection(poligono);
    if (fc) {
      map.addSource("finca-poligono", { type: "geojson", data: fc });
      map.addLayer({
        id: "finca-fill",
        type: "fill",
        source: "finca-poligono",
        paint: {
          "fill-color": "#8ed6aa",
          "fill-opacity": 0.28,
        },
      });
      map.addLayer({
        id: "finca-outline",
        type: "line",
        source: "finca-poligono",
        paint: {
          "line-color": "#0d5c3a",
          "line-width": 2.5,
        },
      });

      const bounds = boundsFromCoords(ringCoords(poligono));
      if (bounds) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 17, duration: 800 });
      }
    } else if (cfg.centro) {
      new mapboxgl.Marker({ color: "#0d5c3a" })
        .setLngLat([cfg.centro.lng, cfg.centro.lat])
        .addTo(map);
      showMapMessage(
        statusEl,
        "Esta finca no tiene polígono cargado. Se muestra el centro registrado.",
      );
      statusEl?.classList.remove("hidden");
    } else {
      showMapMessage(
        statusEl,
        "Sin polígono ni coordenadas. Carga un GPX/KML/GeoJSON en el registro de finca.",
      );
    }

    requestAnimationFrame(() => map.resize());
  });

  zoomInBtn?.addEventListener("click", () => map.zoomIn());
  zoomOutBtn?.addEventListener("click", () => map.zoomOut());
  fitBtn?.addEventListener("click", () => {
    const bounds = boundsFromCoords(ringCoords((cfg.poligono as GeoPolygon | null) ?? null));
    if (bounds) {
      map.fitBounds(bounds, { padding: 64, maxZoom: 17, duration: 600 });
    } else if (cfg.centro) {
      map.flyTo({ center: [cfg.centro.lng, cfg.centro.lat], zoom: 15 });
    }
  });

  window.addEventListener("resize", () => map.resize());
}
