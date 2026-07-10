import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme/theme';
import { Search, MapPin, Trees, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import SafeStorage from '../../../utils/SafeStorage';
import CryptoJS from 'crypto-js';
import { db } from '../../../data/local/database';
import { fincas as fincasSchema } from '../../../data/local/esquema';
import { endpoints } from '../../../api/endpoints';
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
        ? endpoints.fincas.porUsuario(user.id)
        : endpoints.fincas.getAll;
      
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
    <ImageBackground 
      source={require('../../../../assets/login_screen.jpeg')} 
      style={styles.background}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Labores Agrícolas</Text>
          <Text style={styles.subtitle}>Selecciona una finca</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
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
          <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={filteredFincas}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.fincaCard} 
                onPress={() => navigation.navigate('CalendarioLabores', { finca: item })}
                activeOpacity={0.8}
              >
                <View style={styles.fincaIconContainer}>
                  <Trees size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.fincaInfoContainer}>
                  <Text style={styles.fincaNombre}>{item.nombre}</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={14} color={theme.colors.outline} style={{ marginRight: 4 }} />
                    <Text style={styles.fincaSub}>{item.provincia || 'S/P'}, {item.canton || 'S/C'}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={theme.colors.outlineVariant} />
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 20, 30, 0.70)', // Dark elegant overlay
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    height: 36,
    color: theme.colors.onSurface,
    fontSize: 16,
  },
  fincaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fincaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 67, 40, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fincaInfoContainer: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fincaNombre: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.onSurface,
    letterSpacing: 0.3,
  },
  fincaSub: {
    fontSize: 13,
    color: theme.colors.outline,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  }
});
