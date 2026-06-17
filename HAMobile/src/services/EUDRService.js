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
      throw new Error(errorData.detail || errorData.message || `HTTP Error ${response.status}`);
    }
    return response.json();
  }

  // 1. Crear Productor
  async crearProductor(productorData) {
    const response = await fetch(`${API_BASE_URL}/v1/productores/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(productorData)
    });
    return this.checkResponse(response);
  }

  // 2. Crear Finca
  async crearFinca(fincaData) {
    const response = await fetch(`${API_BASE_URL}/v1/fincas/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(fincaData)
    });
    return this.checkResponse(response);
  }

  // 3. Crear Expediente
  async crearExpediente(expedienteData) {
    const response = await fetch(`${API_BASE_URL}/v1/expedientes/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(expedienteData)
    });
    return this.checkResponse(response);
  }

  // 4. Sincronización Masiva Offline
  async syncUpload(syncPackage) {
    const response = await fetch(`${API_BASE_URL}/v1/sync/upload`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(syncPackage)
    });
    return this.checkResponse(response);
  }
}
