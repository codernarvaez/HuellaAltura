import SafeStorage from '../utils/SafeStorage';
import CryptoJS from 'crypto-js';
import * as Application from 'expo-application';

const TOKEN_KEY = 'auth_token_enc';

// Configuración fija para evitar el error de "Native crypto module" en RN.
// TODO(C1): centralizar también el cifrado y migrar a expo-secure-store.
const CRYPTO_CONFIG = {
  iv: CryptoJS.enc.Hex.parse('101112131415161718191a1b1c1d1e1f'),
  salt: CryptoJS.enc.Hex.parse('0001020304050607'),
};

const getEncryptionKey = () => {
  try {
    const hardwareId = Application.getAndroidId() || 'ha_fallback_id_safe';
    return CryptoJS.SHA256(`ha_mobile_v1_${hardwareId}`).toString();
  } catch (e) {
    return 'ha_emergency_key_js_only';
  }
};

/**
 * Devuelve el JWT descifrado, o null si no hay sesión con backend
 * (por ejemplo, en modo demostración).
 */
export const obtenerToken = async () => {
  try {
    const encryptedToken = await SafeStorage.getItem(TOKEN_KEY);
    if (!encryptedToken) return null;
    const bytes = CryptoJS.AES.decrypt(encryptedToken, getEncryptionKey(), CRYPTO_CONFIG);
    return bytes.toString(CryptoJS.enc.Utf8) || null;
  } catch (e) {
    return null;
  }
};
