import NetInfo from '@react-native-community/netinfo';
import { SyncService } from './SyncService';
import CryptoJS from 'crypto-js';
import * as Application from 'expo-application';
import SafeStorage from '../utils/SafeStorage';
import { DatabaseManager } from '../data/local/database';

const getEncryptionKey = () => {
  try {
    const hardwareId = Application.getAndroidId() || 'ha_fallback_id_safe';
    return CryptoJS.SHA256(`ha_mobile_v1_${hardwareId}`).toString();
  } catch (e) {
    return 'ha_emergency_key_js_only';
  }
};

const obtenerToken = async () => {
  try {
    const encryptedToken = await SafeStorage.getItem('auth_token_enc');
    if (!encryptedToken) return null;
    const bytes = CryptoJS.AES.decrypt(encryptedToken, getEncryptionKey());
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return null;
  }
};

export class SyncManager {
  private static isSyncing = false;

  static initialize() {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        this.triggerSync();
      }
    });
  }

  static async triggerSync() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    try {
      try {
        DatabaseManager.instance;
      } catch (e) {
        await DatabaseManager.initialize('0000');
      }

      const token = await obtenerToken();
      if (token) {
        await SyncService.syncAll(token);
      }
    } catch (error) {
      console.warn('Auto-sync fallido:', error);
    } finally {
      this.isSyncing = false;
    }
  }
}
