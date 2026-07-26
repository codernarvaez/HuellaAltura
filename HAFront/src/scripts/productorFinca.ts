import { FincaService } from "../services/finca.service.ts";
import { GeoespacialService } from "../services/geoespacial.service.ts";
import { API_URL } from "../services/Api_Base.ts";

// ===== Tipos opcionales, si usas TS estricto =====
interface UserData {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  identifier?: string;
  organizacion?: string;
  phone_number?: string;
  genero?: string;
  edad?: number;
  nivel_educativo?: string;
}

interface FincaData {
  id: string;
  nombre?: string;
  eudr_id?: string;
  provincia?: string;
  canton?: string;
  parroquia?: string;
  sector?: string;
  area_total_ha?: number;
  area_cultivada_ha?: number;
  tenencia?: string;
  latitud?: number;
  longitud?: number;
  poligono?: any;
  variedad_cafe?: string;
  densidad_siembra?: number;
  origen_semilla?: string;
  anio_establecimiento?: number;
}

// ===== Utilidades compartidas =====
function notify(message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  if (type === 'error') {
    alert('❌ ' + message);
  }
}

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

// ===== Punto de entrada =====
document.addEventListener('DOMContentLoaded', () => {
  // Datos inyectados desde el servidor vía window.*
  let usuarioId: string = window.USUARIO_ID || '';
  let userData: UserData | null = window.USER_DATA || null;
  let fincaData: FincaData | null = window.FINCA_DATA || null;
  const poligonoData = window.POLIGONO_DATA || null;

  console.log('📦 Datos del productor:', userData);
  console.log('🏡 Datos de finca:', fincaData);

  // ---------- BLOQUE 1: Productor / Finca (editar y guardar) ----------
  function updateAuthNameDisplay() {
    const authNameDisplay = document.getElementById('productor-auth-name-display');
    if (!authNameDisplay) return;
    if (userData) {
      const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
      authNameDisplay.textContent = fullName || userData.email || 'Sin nombre';
    } else {
      authNameDisplay.textContent = 'No hay sesión';
    }
  }

  const editarProductorBtn = document.getElementById('editar-productor');
  const editarFincaBtn = document.getElementById('editar-finca');
  const guardarProductorBtn = document.getElementById('guardar-productor');
  const cancelarProductorBtn = document.getElementById('cancelar-productor');
  const guardarFincaBtn = document.getElementById('guardar-finca');
  const cancelarFincaBtn = document.getElementById('cancelar-finca');
  const guardarFincaSubmit = document.getElementById('guardar-finca-submit');

  if (userData) {
    if (fincaData && fincaData.id) {
      notify('✅ Información cargada correctamente', 'success');
    } else {
      notify('ℹ️ Completa los datos de la finca', 'info');
    }
    updateAuthNameDisplay();
  } else {
    const errorMsg = window.ERROR || '';
    notify(errorMsg ? '❌ Error: ' + errorMsg : '⚠️ No hay sesión activa o el token es inválido', 'error');
    const el = document.getElementById('productor-auth-name-display');
    if (el) el.textContent = 'No hay sesión';
  }

  editarProductorBtn?.addEventListener('click', () => {
    document.querySelectorAll('#productor-nombre, #productor-cedula, #productor-organizacion, #productor-celular, #productor-edad')
      .forEach(el => {
        el.removeAttribute('readonly');
        el.classList.remove('bg-surface');
        el.classList.add('bg-white');
      });
    document.getElementById('productor-genero')?.removeAttribute('disabled');
    document.getElementById('productor-nivel')?.removeAttribute('disabled');
    editarProductorBtn.classList.add('hidden');
    guardarProductorBtn?.classList.remove('hidden');
    cancelarProductorBtn?.classList.remove('hidden');
    notify('✏️ Modo edición activado', 'warning');
  });

  cancelarProductorBtn?.addEventListener('click', () => location.reload());

  guardarProductorBtn?.addEventListener('click', async () => {
  const nombreCompleto = (document.getElementById('productor-nombre') as HTMLInputElement)?.value || '';
  const partes = nombreCompleto.trim().split(' ');
  const firstName = partes[0] || '';
  const lastName = partes.slice(1).join(' ') || '';

  const payload = {
    first_name: firstName,
    last_name: lastName,
    identifier: (document.getElementById('productor-cedula') as HTMLInputElement)?.value || '',
    organizacion: (document.getElementById('productor-organizacion') as HTMLInputElement)?.value || '',
    phone_number: (document.getElementById('productor-celular') as HTMLInputElement)?.value || '',
    genero: (document.getElementById('productor-genero') as HTMLSelectElement)?.value || '',
    edad: parseInt((document.getElementById('productor-edad') as HTMLInputElement)?.value) || null,
    nivel_educativo: (document.getElementById('productor-nivel') as HTMLSelectElement)?.value || ''
  };

  try {
    notify('⏳ Guardando cambios...', 'warning');
    const token = getCookie('token');

    const response = await fetch(`${API_URL}/api/v1/usuarios/${usuarioId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      userData = await response.json();
      updateAuthNameDisplay();
      notify('✅ Productor actualizado correctamente', 'success');
      setTimeout(() => location.reload(), 1500);
    } else {
      const errorData = await response.json().catch(() => ({}));
      notify('❌ Error: ' + (errorData.detail || errorData.message || 'Error al actualizar'), 'error');
    }
  } catch {
    notify('❌ Error al guardar los cambios', 'error');
  }
});

  editarFincaBtn?.addEventListener('click', () => {
    ['finca-nombre', 'finca-barrio', 'finca-area-cultivada', 'finca-variedad', 'finca-densidad', 'finca-origen-semilla', 'finca-anio']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.removeAttribute('readonly');
          el.classList.remove('bg-surface');
          el.classList.add('bg-white');
        }
      });
    document.getElementById('finca-tenencia')?.removeAttribute('disabled');
    editarFincaBtn.classList.add('hidden');
    guardarFincaBtn?.classList.remove('hidden');
    cancelarFincaBtn?.classList.remove('hidden');
    notify('✏️ Modo edición de finca activado', 'warning');
  });

  cancelarFincaBtn?.addEventListener('click', () => location.reload());

  async function guardarFinca() {
    const nombre = (document.getElementById('finca-nombre') as HTMLInputElement)?.value || '';
    const provincia = (document.getElementById('finca-provincia') as HTMLInputElement)?.value || '';
    const canton = (document.getElementById('finca-canton') as HTMLInputElement)?.value || '';
    const parroquia = (document.getElementById('finca-parroquia') as HTMLInputElement)?.value || '';
    const sector = (document.getElementById('finca-barrio') as HTMLInputElement)?.value || '';
    const areaTotal = parseFloat((document.getElementById('finca-area-total') as HTMLInputElement)?.value) || 0;
    const areaCultivada = parseFloat((document.getElementById('finca-area-cultivada') as HTMLInputElement)?.value) || 0;
    const tenencia = (document.getElementById('finca-tenencia') as HTMLSelectElement)?.value || 'PROPIA';
    const latitud = parseFloat((document.getElementById('finca-latitud') as HTMLInputElement)?.value) || null;
    const longitud = parseFloat((document.getElementById('finca-longitud') as HTMLInputElement)?.value) || null;

    const variedad_cafe = (document.getElementById('finca-variedad') as HTMLInputElement)?.value || null;
    const densidadEl = (document.getElementById('finca-densidad') as HTMLInputElement)?.value;
    const densidad_siembra = densidadEl ? parseInt(densidadEl) : null;
    const origen_semilla = (document.getElementById('finca-origen-semilla') as HTMLInputElement)?.value || null;
    const anioEl = (document.getElementById('finca-anio') as HTMLInputElement)?.value;
    const anio_establecimiento = anioEl ? parseInt(anioEl) : null;

    let poligono = window.POLIGONO_CARGADO || fincaData?.poligono || null;

    const payload: any = {
      nombre, provincia, canton,
      parroquia: parroquia || undefined,
      sector: sector || undefined,
      area_total_ha: areaTotal,
      area_cultivada_ha: areaCultivada,
      tenencia, latitud, longitud, poligono,
      variedad_cafe, densidad_siembra, origen_semilla, anio_establecimiento
    };

    const fincaId = fincaData?.id;
    const token = getCookie('token');

    if (!usuarioId && !fincaId) {
      notify('❌ Error: ID de usuario no encontrado', 'error');
      return;
    }

    try {
      notify('⏳ Guardando finca...', 'warning');
      let result;
      if (fincaId) {
        result = await FincaService.update(fincaId, payload, token);
        notify('✅ Finca actualizada correctamente', 'success');
      } else {
        if (!usuarioId) throw new Error('No se encontró el ID del usuario.');
        payload.usuario_id = usuarioId;
        result = await FincaService.create(payload, token);
        notify('✅ Finca creada correctamente', 'success');
      }

      if (result.id) {
        const irLink = document.getElementById('ir-info-agro') as HTMLAnchorElement;
        if (irLink) {
          irLink.href = `/infoAgro?finca_id=${result.id}`;
          irLink.classList.remove('cursor-not-allowed', 'opacity-60', 'bg-gray-300', 'text-gray-500');
          irLink.classList.add('bg-primary', 'text-white', 'shadow-sm');
          irLink.onclick = null;
        }
        fincaData = result;
      }
      setTimeout(() => location.reload(), 1500);
    } catch (error: any) {
      notify('❌ Error: ' + (error.message || 'Error al guardar finca'), 'error');
    }
  }

  window.guardarFinca = guardarFinca;
  guardarFincaSubmit?.addEventListener('click', guardarFinca);
  guardarFincaBtn?.addEventListener('click', guardarFinca);

  // ---------- BLOQUE 2: Mapa y carga de archivos ----------
  const metodoManual = document.getElementById('metodo-manual');
  const metodoArchivo = document.getElementById('metodo-archivo');
  const manualContent = document.getElementById('manual-content');
  const archivoContent = document.getElementById('archivo-content');

  metodoManual?.addEventListener('click', () => {
    metodoManual.classList.add('active');
    metodoArchivo?.classList.remove('active');
    manualContent?.classList.add('active');
    archivoContent?.classList.remove('active');
  });

  metodoArchivo?.addEventListener('click', () => {
    metodoArchivo.classList.add('active');
    metodoManual?.classList.remove('active');
    archivoContent?.classList.add('active');
    manualContent?.classList.remove('active');
  });

  const defaultLat = parseFloat(String(fincaData?.latitud)) || -4.2625;
  const defaultLng = parseFloat(String(fincaData?.longitud)) || -79.2231;

  // @ts-ignore - Leaflet viene del CDN como global L
  const map = L.map('map').setView([defaultLat, defaultLng], 13);

  // @ts-ignore
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  function mostrarPoligono(poligono: any) {
    if (!poligono || poligono.type !== 'Polygon') return;
    const coords = poligono.coordinates[0];
    if (!coords || coords.length === 0) return;

    const latLngs = coords.map((c: number[]) => [c[1], c[0]]);
    // @ts-ignore
    const polygon = L.polygon(latLngs, { color: '#2563eb', weight: 3, fillColor: '#3b82f6', fillOpacity: 0.3 }).addTo(map);
    // @ts-ignore
    L.polyline(latLngs, { color: '#1e40af', weight: 4, opacity: 0.8 }).addTo(map);

    latLngs.forEach((coord: number[], index: number) => {
      // @ts-ignore
      L.circleMarker(coord, { radius: 6, fillColor: '#ef4444', color: '#dc2626', weight: 2 })
        .addTo(map)
        .bindPopup(`<strong>Vértice ${index + 1}</strong><br>Lat: ${coord[0].toFixed(6)}<br>Lng: ${coord[1].toFixed(6)}`);

      // @ts-ignore
      const icon = L.divIcon({
        className: 'vertex-label',
        html: `<span style="background:#2563eb;color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${index + 1}</span>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      // @ts-ignore
      L.marker(coord, { icon }).addTo(map);
    });

    // @ts-ignore
    map.fitBounds(polygon.getBounds());
    polygon.bindPopup(`<strong>${fincaData?.nombre || 'Finca'}</strong><br>Área: ${fincaData?.area_total_ha || 'N/A'} ha`);
  }

  if (poligonoData?.type) mostrarPoligono(poligonoData);

  setTimeout(() => map.invalidateSize(), 500);
  window.addEventListener('resize', () => map.invalidateSize());

  // ----- Carga de archivos -----
  const dropZone = document.getElementById('drop-zone')!;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const fileInfo = document.getElementById('file-info')!;
  const fileNameEl = document.getElementById('file-name')!;
  const fileSizeEl = document.getElementById('file-size')!;
  const procesarBtn = document.getElementById('procesar-archivo')!;
  const eliminarBtn = document.getElementById('eliminar-archivo')!;
  const cargaProgreso = document.getElementById('carga-progreso')!;
  const resultadoCarga = document.getElementById('resultado-carga')!;
  const nombreArchivoInput = document.getElementById('finca-nombre-archivo') as HTMLInputElement;

  let archivoSeleccionado: File | null = null;

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function construirPoligono(coordenadas: number[][]) {
    if (!coordenadas || coordenadas.length < 3) return null;
    const coordsGeoJson = coordenadas.map(c => [c[1], c[0]]);
    const first = coordsGeoJson[0];
    const last = coordsGeoJson[coordsGeoJson.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) coordsGeoJson.push(first);
    return { type: 'Polygon', coordinates: [coordsGeoJson] };
  }

  function llenarFormularioConDatos(data: any) {
    const sugerencias = data.sugerencias || {};
    const ubicacion = data.ubicacion || {};
    const centro = data.centro || {};
    const coordenadas = data.coordenadas || [];

    const nombreField = document.getElementById('finca-nombre') as HTMLInputElement;
    const nombreActual = nombreField.value.trim();
    const nombreIngresado = nombreArchivoInput?.value.trim();
    if (!nombreActual && nombreIngresado) {
      nombreField.value = nombreIngresado;
    } else if (!nombreActual) {
      nombreField.value = sugerencias.nombre || 'Finca sin nombre';
    }

    (document.getElementById('finca-provincia') as HTMLInputElement).value = ubicacion.provincia || '';
    (document.getElementById('finca-canton') as HTMLInputElement).value = ubicacion.canton || '';
    (document.getElementById('finca-parroquia') as HTMLInputElement).value = ubicacion.parroquia || '';
    (document.getElementById('finca-barrio') as HTMLInputElement).value = ubicacion.sector || '';
    (document.getElementById('finca-area-total') as HTMLInputElement).value = data.area_hectareas || '';

    if (centro.latitud) (document.getElementById('finca-latitud') as HTMLInputElement).value = centro.latitud;
    if (centro.longitud) (document.getElementById('finca-longitud') as HTMLInputElement).value = centro.longitud;

    const poligonoCargado = construirPoligono(coordenadas);
    window.POLIGONO_CARGADO = poligonoCargado;

    resultadoCarga.innerHTML = `
      <div class="bg-green-50 border border-green-500 rounded-xl p-4">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-green-500">check_circle</span>
          <span class="font-semibold text-green-700">✅ Datos cargados desde el archivo</span>
        </div>
        <p class="text-sm text-on-surface-variant mt-2">Los datos se han cargado en el formulario. Revisa y guarda los cambios.</p>
        <p class="text-sm text-primary mt-1">📍 Polígono: ${coordenadas.length} puntos cargados</p>
        ${nombreIngresado ? `<p class="text-sm text-primary mt-1">📌 Nombre ingresado: <strong>${nombreIngresado}</strong></p>` : ''}
        ${centro.latitud ? `<p class="text-sm text-primary mt-1">📍 Centro: ${centro.latitud}, ${centro.longitud}</p>` : ''}
      </div>
    `;
    resultadoCarga.classList.remove('hidden');
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer?.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => {
    const target = e.target as HTMLInputElement;
    if (target.files?.length) handleFile(target.files[0]);
  });

  function handleFile(file: File) {
    const validExtensions = ['gpx', 'kml', 'geojson', 'json'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!validExtensions.includes(ext)) {
      alert('Formato no soportado. Usa .gpx, .kml, .geojson o .json');
      return;
    }
    archivoSeleccionado = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSize(file.size);
    fileInfo.classList.remove('hidden');
    dropZone.style.display = 'none';
    resultadoCarga.classList.add('hidden');
  }

  eliminarBtn.addEventListener('click', () => {
    archivoSeleccionado = null;
    window.POLIGONO_CARGADO = null;
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    dropZone.style.display = 'block';
    resultadoCarga.classList.add('hidden');
    resultadoCarga.innerHTML = '';
    nombreArchivoInput.value = '';
  });

  procesarBtn.addEventListener('click', async () => {
    if (!archivoSeleccionado) {
      alert('Primero selecciona un archivo');
      return;
    }
    const nombreIngresado = nombreArchivoInput?.value.trim();
    if (!nombreIngresado) {
      alert('⚠️ Por favor, ingresa un nombre para la finca antes de procesar el archivo.');
      nombreArchivoInput.focus();
      nombreArchivoInput.classList.add('border-error');
      setTimeout(() => nombreArchivoInput.classList.remove('border-error'), 3000);
      return;
    }

    cargaProgreso.classList.remove('hidden');
    resultadoCarga.classList.add('hidden');

    try {
      const token = getCookie('token');
      const data = await GeoespacialService.cargarArchivo(archivoSeleccionado, token);
      cargaProgreso.classList.add('hidden');
      llenarFormularioConDatos(data);
      notify('✅ Datos del archivo cargados correctamente. Revisa y presiona "Guardar Finca".', 'success');
    } catch (error: any) {
      cargaProgreso.classList.add('hidden');
      notify('❌ Error al procesar el archivo: ' + error.message, 'error');
    }
  });
});