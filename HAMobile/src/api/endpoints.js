const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const EXPED_API_URL = process.env.EXPO_PUBLIC_EXPED_API_URL;

export const endpoints = {
  auth: {
    me: `${API_BASE_URL}/auth/me`,
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
  },
  fincas: {
    getAll: `${EXPED_API_URL}/fincas/`,
    porUsuario: (userId) => `${EXPED_API_URL}/fincas/por-usuario/${userId}`,
  },
  labores: {
    calendario: (fincaId) => `${EXPED_API_URL}/labores/calendario/${fincaId}`,
    agendar: `${EXPED_API_URL}/labores/agendar`,
    ejecutar: (laborId) => `${EXPED_API_URL}/labores/${laborId}/ejecutar`,
    subirEvidencia: `${EXPED_API_URL}/labores/subir-evidencia`,
    sugerencias: (mes) => `${EXPED_API_URL}/labores/sugerencias/${mes}`,
    validarNorma: (laborId) => `${EXPED_API_URL}/labores/${laborId}/validar-norma`,
    aprobar: (laborId) => `${EXPED_API_URL}/labores/${laborId}/aprobar`,
    ledger: (fincaId) => `${EXPED_API_URL}/labores/ledger/${fincaId}`,
  },
  agroambiental: {
    base: `${EXPED_API_URL}/agroambiental`,
    getByFinca: (fincaId) => `${EXPED_API_URL}/agroambiental/${fincaId}`,
  },
  expedientes: {
    base: `${EXPED_API_URL}/expedientes`,
  },
  sync: {
    upload: `${EXPED_API_URL}/sync/upload`,
  },
  acopio: {
    // El backend monta /acopio en la raíz del servicio, no bajo /api/v1
    muestras: `${EXPED_API_URL?.replace(/\/api\/v1\/?$/, '')}/acopio/muestras/`,
  }
};
