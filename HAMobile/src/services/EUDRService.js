import { EXPED_API_URL, API_BASE_URL } from '@env';

export class EUDRService {
  constructor(token) {
    this.token = token;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
    
    // Si EXPED_API_URL no está definido, usamos API_BASE_URL/v1 como fallback
    this.baseUrl = EXPED_API_URL || `${API_BASE_URL}/v1`;
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
    const url = `${this.baseUrl}/fincas/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(fincaData)
    });
    return this.checkResponse(response);
  }

  // 2. Crear datos agroambientales
  async crearDatosAgroambientales(datosData) {
    const url = `${this.baseUrl}/agroambiental/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(datosData)
    });
    return this.checkResponse(response);
  }

  // 3. Crear expediente
  async crearExpediente(expedienteData) {
    const url = `${this.baseUrl}/expedientes/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(expedienteData)
    });
    return this.checkResponse(response);
  }

  // 4. Sincronización Masiva Offline (Mantiene compatibilidad si existe el endpoint)
  async syncUpload(syncPackage) {
    const response = await fetch(`${this.baseUrl}/sync/upload`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(syncPackage)
    });
    return this.checkResponse(response);
  }
}
