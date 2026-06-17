import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '@env';
import SafeStorage from '../utils/SafeStorage';
import { jwtDecode } from 'jwt-decode';
import CryptoJS from 'crypto-js';
import * as Application from 'expo-application';

const AuthContext = createContext();

const TOKEN_KEY = 'auth_token_enc';
const USER_KEY = 'user_data';

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
      const encryptedToken = await SafeStorage.getItem(TOKEN_KEY);
      const userDataStr = await SafeStorage.getItem(USER_KEY);

      if (encryptedToken && userDataStr) {
        const bytes = CryptoJS.AES.decrypt(encryptedToken, getEncryptionKey());
        const token = bytes.toString(CryptoJS.enc.Utf8);

        if (token) {
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000;

          if (decoded.exp > currentTime) {
            setUser(JSON.parse(userDataStr));
            setIsAuthenticated(true);
          } else {
            await signOut();
          }
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        const token = data.access_token;
        const encryptedToken = CryptoJS.AES.encrypt(token, getEncryptionKey()).toString();
        
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
      console.error('Login error:', error);
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

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.message || 'Error en el registro' };
      }
    } catch (error) {
      console.error('Registration error:', error);
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
