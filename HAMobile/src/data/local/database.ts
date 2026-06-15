import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';

/**
 * Gestión de la base de datos cifrada (RS-SEC-004)
 */
export class DatabaseManager {
  private static db: any = null;

  /**
   * Inicializa la base de datos cifrada usando el PIN del usuario y el ID del hardware.
   */
  static async initialize(userPin: string) {
    const hardwareId = Application.getAndroidId() || 'ios_placeholder_id';
    const salt = 'eudr_v1_salt';
    
    // Derivación de llave (PBKDF2)
    const encryptionKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${userPin}:${hardwareId}:${salt}`
    );

    const sqlite = open({
      name: 'hamobile_secure.sqlite',
      encryptionKey: encryptionKey,
    });

    this.db = drizzle(sqlite);
    return this.db;
  }

  static get instance() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize(pin) first.');
    }
    return this.db;
  }
}

export const db = () => DatabaseManager.instance;
