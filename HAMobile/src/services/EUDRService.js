export class EUDRService {
  constructor(token) {
    if (!token) throw new Error('Se requiere token de autenticación');
    this.token = token;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    
    // Updated to use EXPO_PUBLIC env vars
    this.baseUrl = process.env.EXPO_PUBLIC_EXPED_API_URL || `${process.env.EXPO_PUBLIC_API_BASE_URL}/v1`;
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
