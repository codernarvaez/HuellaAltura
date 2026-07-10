import React, { createContext, useState, useContext, useEffect } from 'react';

import SafeStorage from '../utils/SafeStorage';
import { endpoints } from '../api/endpoints';
import { jwtDecode } from 'jwt-decode';
import CryptoJS from 'crypto-js';
import * as Application from 'expo-application';
import { DatabaseManager, db } from '../data/local/database';
import { productores } from '../data/local/esquema/productores';
import { eq } from 'drizzle-orm';

export const AuthContext = createContext({});

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

  const saveUserToLocalDB = async (userData) => {
    try {
      const sqlite = db();
      
      // Mapear campos de API a Esquema de BD local (snake_case consistente)
      const productorData = {
        id: userData.id,
        first_name: userData.first_name || 'Usuario',
        last_name: userData.last_name || '',
        cedula_id: userData.identifier || '0000000000',
        email: userData.email,
        phone_number: userData.phone_number,
        edad: userData.edad,
        genero: userData.genero,
        nivel_educativo: userData.nivel_educativo,
        organizacion: userData.organizacion,
        sync_status: 'synced', // Ya viene del servidor
        creado_en: new Date(),
      };

      // Verificar si ya existe para hacer upsert manual (SQLite op-sqlite compatibility)
      const existing = await sqlite.select().from(productores).where(eq(productores.id, userData.id)).limit(1);
      
      if (existing.length > 0) {
        await sqlite.update(productores)
          .set(productorData)
          .where(eq(productores.id, userData.id));
      } else {
        await sqlite.insert(productores).values(productorData);
      }
      return true;
    } catch (error) {
      console.error('[AuthContext] Error guardando productor en local:', error);
      return false;
    }
  };

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
    const url = endpoints.auth.me;
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
    const url = endpoints.auth.login;
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
          // Guardar en la BD local antes de permitir el login (RS-SEC-004)
          const savedLocal = await saveUserToLocalDB(userData);
          
          if (savedLocal) {
            await SafeStorage.setItem(USER_KEY, JSON.stringify(userData));
            setUser(userData);
            setIsAuthenticated(true);
            return { success: true };
          } else {
            return { success: false, error: 'Error al inicializar almacenamiento local de perfil' };
          }
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
    try {
      const payload = {
        ...userData,
        role_name: userData.role_name || 'PRODUCTOR',
        status: userData.status || 'ACTIVO',
      };
      
      // Aseguramos que los enumeradores siempre vayan en MAYÚSCULAS según el backend
      if (payload.genero) {
        payload.genero = payload.genero.toUpperCase();
      }
      if (payload.nivel_educativo) {
        payload.nivel_educativo = payload.nivel_educativo.toUpperCase();
      }
      
      const url = endpoints.auth.register;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

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

  const updateUserProfile = async (newUserData) => {
    try {
      // 1. Guardar en SQLite
      const savedLocal = await saveUserToLocalDB(newUserData);
      if (savedLocal) {
        // 2. Guardar en SafeStorage
        await SafeStorage.setItem(USER_KEY, JSON.stringify(newUserData));
        // 3. Actualizar estado global
        setUser(newUserData);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[AuthContext] Error actualizando perfil localmente:', e);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, signIn, register, signOut, updateUserProfile }}>
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
