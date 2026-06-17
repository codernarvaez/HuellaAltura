import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Wrapper para AsyncStorage.
 * Se eliminó el fallback de memoria por petición del usuario.
 */
const SafeStorage = {
  /**
   * Recupera un valor de AsyncStorage.
   */
  getItem: async (key) => {
    return await AsyncStorage.getItem(key);
  },

  /**
   * Guarda un valor en AsyncStorage.
   */
  setItem: async (key, value) => {
    await AsyncStorage.setItem(key, String(value));
  },

  /**
   * Elimina una clave de AsyncStorage.
   */
  removeItem: async (key) => {
    await AsyncStorage.removeItem(key);
  },

  /**
   * Limpia todo AsyncStorage.
   */
  clear: async () => {
    await AsyncStorage.clear();
  }
};

export default SafeStorage;
