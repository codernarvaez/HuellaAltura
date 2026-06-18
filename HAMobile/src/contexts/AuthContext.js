import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '@env';
import SafeStorage from '../utils/SafeStorage';
import { jwtDecode } from 'jwt-decode';
import CryptoJS from 'crypto-js';
import * as Application from 'expo-application';
import { DatabaseManager } from '../data/local/database';

const AuthContext = createContext();

const TOKEN_KEY = 'auth_token_enc';
const USER_KEY = 'user_data';

// Configuración fija para evitar el error de "Native crypto module" en React Native
// Al proporcionar IV y Salt manuales, CryptoJS no intenta generar valores aleatorios
const CRYPTO_CONFIG = {
  iv: CryptoJS.enc.Hex.parse('101112131415161718191a1b1c1d1e1f'),
  salt: CryptoJS.enc.Hex.parse('0001020304050607')
};

const getEncryptionKey = () => {
  try {
    const hardwareId = Application.getAndroidId() || 'ha_fallback_id_safe';
    return CryptoJS.SHA256(`ha_mobile_v1_${hardwareId}`).toString();
  } catch (e) {
    return 'ha_emergency_key_js_only';
  }
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      // Inicializar la base de datos con un PIN por defecto para cumplir con RS-SEC-004
      // En una versión futura, esto podría solicitarse al usuario.
      await DatabaseManager.initialize('0000');

      const encryptedToken = await SafeStorage.getItem(TOKEN_KEY);
      const userDataStr = await SafeStorage.getItem(USER_KEY);

      if (encryptedToken && userDataStr) {
        const key = getEncryptionKey();
        try {
          const bytes = CryptoJS.AES.decrypt(encryptedToken, key, CRYPTO_CONFIG);
          const token = bytes.toString(CryptoJS.enc.Utf8);

          if (token) {
            const decoded = jwtDecode(token);
            const currentTime = Date.now() / 1000;

            if (decoded.exp > currentTime) {
              try {
                setUser(JSON.parse(userDataStr));
                setIsAuthenticated(true);
              } catch (parseError) {
                console.error('[AuthContext] Error parseando datos de sesión:', parseError);
                await signOut();
              }
            } else {
              await signOut();
            }
          }
        } catch (decryptError) {
          console.error('[AuthContext] Error al descifrar sesión:', decryptError);
          await signOut();
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error cargando sesión:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (token) => {
    const url = `${API_BASE_URL}/auth/me`;
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('[AuthContext] Error fetching user data:', error);
      return null;
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    const url = `${API_BASE_URL}/auth/login`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return { 
          success: false, 
          error: `Error del servidor (${response.status}): ${responseText.substring(0, 100)}` 
        };
      }

      if (response.ok && data.access_token) {
        const token = data.access_token;
        const key = getEncryptionKey();
        
        // Cifrado determinístico para evitar error de módulo nativo de random
        const encryptedToken = CryptoJS.AES.encrypt(token, key, CRYPTO_CONFIG).toString();
        
        await SafeStorage.setItem(TOKEN_KEY, encryptedToken);
        const userData = await fetchUserData(token);
        
        if (userData) {
          await SafeStorage.setItem(USER_KEY, JSON.stringify(userData));
          setUser(userData);
          setIsAuthenticated(true);
          return { success: true };
        } else {
          return { success: false, error: 'No se pudieron obtener los datos del perfil' };
        }
      } else {
        return { success: false, error: data.message || 'Error al iniciar sesión' };
      }
    } catch (error) {
      console.error('[AuthContext] Error en login:', error);
      return { success: false, error: 'Error de red. Intente de nuevo.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    console.log('[AuthContext] Iniciando registro con datos:', JSON.stringify(userData, null, 2));
    try {
      const payload = {
        ...userData,
        role_name: userData.role_name || 'PRODUCTOR',
        status: userData.status || 'ACTIVO',
      };
      
      const url = `${API_BASE_URL}/auth/register`;
      console.log('[AuthContext] Enviando POST a:', url);
      console.log('[AuthContext] Payload final:', JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[AuthContext] Status de respuesta:', response.status);
      const responseText = await response.text();
      console.log('[AuthContext] Body de respuesta (raw):', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('[AuthContext] Error parseando JSON:', e, 'Response:', responseText);
        return { 
          success: false, 
          error: `Error del servidor (${response.status}): ${responseText.substring(0, 100) || 'Respuesta no válida'}` 
        };
      }

      if (response.ok) {
        console.log('[AuthContext] Registro exitoso:', data);
        return { success: true, data };
      } else {
        console.error('[AuthContext] Error en registro (JSON):', data);
        
        let errorMessage = 'Error en el registro';
        if (data.message) {
          errorMessage = data.message;
        } else if (data.detail) {
          if (Array.isArray(data.detail)) {
            // Extraer el mensaje del primer error de la lista de FastAPI
            const firstError = data.detail[0];
            errorMessage = firstError.msg || JSON.stringify(firstError);
            
            // Personalizar mensajes comunes
            if (firstError.loc && firstError.loc.includes('genero')) {
              errorMessage = 'El género seleccionado no es válido para el sistema.';
            }
          } else {
            errorMessage = data.detail;
          }
        }
        
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('[AuthContext] Excepción en register:', error);
      return { success: false, error: 'Error de red. Intente de nuevo.' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await SafeStorage.removeItem(TOKEN_KEY);
      await SafeStorage.removeItem(USER_KEY);
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, signIn, register, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
