import { API_BASE_URL } from '@env';

export class EUDRService {
  constructor(token) {
    this.token = token;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  async checkResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[EUDRService] Error Response:', errorData);
      throw new Error(errorData.detail || errorData.message || `HTTP Error ${response.status}`);
    }
    return response.json();
  }

  // 1. Registro de Finca
  async crearFinca(fincaData) {
    const url = `${API_BASE_URL}/v1/fincas/`;
    console.log('[EUDRService] Creando finca en:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(fincaData)
    });
    return this.checkResponse(response);
  }

  // 2. Crear nuevo expediente (incluye datos agroambientales y variables)
  async crearExpediente(expedienteData) {
    const url = `${API_BASE_URL}/v1/expedientes/`;
    console.log('[EUDRService] Creando expediente en:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(expedienteData)
    });
    return this.checkResponse(response);
  }

  // 3. Agregar datos agroambientales a un expediente existente
  async agregarDatosAgroambientales(expedienteId, datosData) {
    const url = `${API_BASE_URL}/v1/expedientes/${expedienteId}/datos-agroambientales`;
    console.log('[EUDRService] Agregando datos a expediente:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(datosData)
    });
    return this.checkResponse(response);
  }

  // 4. Sincronización Masiva Offline (Mantiene compatibilidad si existe el endpoint)
  async syncUpload(syncPackage) {
    const response = await fetch(`${API_BASE_URL}/v1/sync/upload`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(syncPackage)
    });
    return this.checkResponse(response);
  }
}
