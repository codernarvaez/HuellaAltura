import { endpoints } from '../api/endpoints';

export class EUDRService {
  constructor(token) {
    if (!token) throw new Error('Se requiere token de autenticación');
    this.token = token;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    
    // The baseUrl is now managed by endpoints.js, but kept here if needed for dynamic overrides.
    this.baseUrl = endpoints.fincas.getAll.replace('/fincas/', '');
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
    const url = endpoints.fincas.getAll;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(fincaData)
    });
    return this.checkResponse(response);
  }

  // 2. Crear datos agroambientales
  async crearDatosAgroambientales(datosData) {
    const url = `${endpoints.agroambiental.base}/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(datosData)
    });
    return this.checkResponse(response);
  }

  // 3. Crear expediente
  async crearExpediente(expedienteData) {
    const url = `${endpoints.expedientes.base}/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(expedienteData)
    });
    return this.checkResponse(response);
  }

  // 4. Sincronización Masiva Offline (Mantiene compatibilidad si existe el endpoint)
  async syncUpload(syncPackage) {
    const response = await fetch(endpoints.sync.upload, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(syncPackage)
    });
    return this.checkResponse(response);
  }
}
