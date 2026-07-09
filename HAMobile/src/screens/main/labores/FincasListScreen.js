import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme/theme';
import { Search } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import SafeStorage from '../../../utils/SafeStorage';
import CryptoJS from 'crypto-js';
import { db } from '../../../data/local/database';
import { fincas as fincasSchema } from '../../../data/local/esquema';
const getEncryptionKey = () => 'ha_emergency_key_js_only';

export default function FincasListScreen({ navigation }) {
  const { user } = useAuth();
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  const obtenerToken = async () => {
    try {
      const encryptedToken = await SafeStorage.getItem('auth_token_enc');
      if (!encryptedToken) return null;
      const CRYPTO_CONFIG = {
        iv: CryptoJS.enc.Hex.parse('101112131415161718191a1b1c1d1e1f'),
        salt: CryptoJS.enc.Hex.parse('0001020304050607')
      };
      const Application = require('expo-application');
      const hardwareId = Application.getAndroidId() || 'ha_fallback_id_safe';
      const key = CryptoJS.SHA256(`ha_mobile_v1_${hardwareId}`).toString();
      
      const bytes = CryptoJS.AES.decrypt(encryptedToken, key, CRYPTO_CONFIG);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    fetchFincas();
  }, []);

  const fetchFincas = async () => {
    setLoading(true);
    try {
      const token = await obtenerToken();
      if (!token) return;
      let remoteFincas = [];
      const url = user?.role_name === 'PRODUCTOR' 
        ? `${process.env.EXPO_PUBLIC_EXPED_API_URL}/fincas/por-usuario/${user.id}`
        : `${process.env.EXPO_PUBLIC_EXPED_API_URL}/fincas/`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        remoteFincas = await res.json();
      }

      let localFincas = [];
      try {
        const sqlite = db();
        localFincas = await sqlite.select().from(fincasSchema);
      } catch(e) {
        console.warn('Error reading local fincas', e);
      }

      // Combinar priorizando locales y quitando duplicados
      const combined = [...localFincas, ...remoteFincas];
      const uniqueFincas = Array.from(new Map(combined.map(item => [item.id, item])).values());
      
      setFincas(uniqueFincas);
    } catch (error) {
      console.warn('Fetch Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFincas = fincas.filter(f => f.nombre?.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Labores Agrícolas</Text>
        <Text style={styles.subtitle}>Selecciona una finca</Text>
      </View>
      <View style={{ padding: 16 }}>
        <View style={styles.searchBox}>
          <Search size={20} color={theme.colors.onSurfaceVariant} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar finca..." 
            placeholderTextColor={theme.colors.outline}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredFincas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.fincaCard} 
              onPress={() => navigation.navigate('CalendarioLabores', { finca: item })}
            >
              <Text style={styles.fincaNombre}>{item.nombre}</Text>
              <Text style={styles.fincaSub}>{item.provincia || ''}, {item.canton || ''}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron fincas</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.primaryFixedDim,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.onPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    height: 36,
    color: theme.colors.onSurface,
    fontSize: 16,
  },
  fincaCard: {
    backgroundColor: theme.colors.onPrimary,
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  fincaNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  fincaSub: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.outline,
    fontWeight: '500',
  }
});
