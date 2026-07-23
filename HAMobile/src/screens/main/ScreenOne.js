import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, TouchableOpacity, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { eq } from 'drizzle-orm';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme/theme';
import { LogOut, Trees, FileCheck2, Cloud, RefreshCcw, Plus, FlaskConical, CalendarClock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../data/local/database';
import {
  fincas as fincasSchema,
  expedientes as expedientesSchema,
  datosAgroambientales,
  documentosFinca,
  laboresLocales,
  ejecucionesLocales,
  muestrasLocales,
} from '../../data/local/esquema';

const ScreenOne = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({
    fincas: 0,
    expedientes: 0,
    carbono: '0',
    pendingSync: 0
  });

  // Estadísticas reales desde la base local (disponibles offline)
  const cargarStats = useCallback(async () => {
    try {
      const sqlite = db();
      const listaFincas = await sqlite.select().from(fincasSchema);
      const listaExpedientes = await sqlite.select().from(expedientesSchema);
      const datos = await sqlite.select().from(datosAgroambientales);
      const carbonoTotal = datos.reduce((suma, d) => suma + (d.total_stock_carbono || 0), 0);

      let pendientes = 0;
      const tablasSync = [
        fincasSchema, expedientesSchema, datosAgroambientales,
        documentosFinca, laboresLocales, ejecucionesLocales, muestrasLocales,
      ];
      for (const tabla of tablasSync) {
        const filas = await sqlite.select().from(tabla).where(eq(tabla.sync_status, 'pending'));
        pendientes += filas.length;
      }

      setStats({
        fincas: listaFincas.length,
        expedientes: listaExpedientes.length,
        carbono: carbonoTotal.toLocaleString('es-EC', { maximumFractionDigits: 1 }),
        pendingSync: pendientes,
      });
    } catch (e) {
      console.warn('[Inicio] Error cargando estadísticas locales:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargarStats(); }, [cargarStats]));

  const esTecnico = user?.role_name === 'TECNICO_CAMPO';
  const esAuditor = user?.role_name === 'AUDITOR_INTERNO';

  return (
    <ImageBackground 
      source={require('../../../assets/login_screen.jpeg')} 
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                <Image source={require('../../../assets/Logo.png')} style={styles.avatar} resizeMode="contain" />
              </View>
              <View>
                <Text style={styles.greeting}>Hola,</Text>
                <Text style={styles.userName}>{user?.first_name || 'Productor'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <LogOut size={22} color={theme.colors.secondaryFixed} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.sectionTitle}>Resumen General</Text>

          {/* Grid de Stats */}
          <View style={styles.grid}>
            {/* Card 1: Fincas */}
            <View style={styles.card}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 67, 40, 0.1)' }]}>
                <Trees size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.cardValue}>{stats.fincas}</Text>
              <Text style={styles.cardLabel}>Fincas Registradas</Text>
            </View>

            {/* Card 2: Expedientes */}
            <View style={styles.card}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(119, 90, 25, 0.1)' }]}>
                <FileCheck2 size={24} color={theme.colors.secondary} />
              </View>
              <Text style={styles.cardValue}>{stats.expedientes}</Text>
              <Text style={styles.cardLabel}>Expedientes EUDR</Text>
            </View>
          </View>

          {/* Card 3: Carbono (Ancha) */}
          <View style={styles.wideCard}>
            <View style={styles.wideCardContent}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(99, 37, 39, 0.1)' }]}>
                <Cloud size={24} color={theme.colors.tertiary} />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={styles.cardValue}>{stats.carbono} t</Text>
                <Text style={styles.cardLabel}>Stock Total de Carbono</Text>
              </View>
            </View>
          </View>

          {/* Card 4: Sincronización (Ancha) */}
          <View style={[styles.wideCard, styles.syncCard]}>
            <View style={styles.wideCardContent}>
              <RefreshCcw size={22} color={stats.pendingSync > 0 ? theme.colors.secondary : theme.colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.syncTitle, { color: stats.pendingSync > 0 ? theme.colors.secondary : theme.colors.primary }]}>
                  {stats.pendingSync > 0 ? 'Sincronización Pendiente' : 'Todo Sincronizado'}
                </Text>
                <Text style={styles.syncDesc}>
                  {stats.pendingSync > 0 
                    ? `Tienes ${stats.pendingSync} registros por subir a la nube.` 
                    : 'Tus datos locales están respaldados en la nube.'}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flex: 1 }} />

          {/* Acción principal según el rol del usuario */}
          {esTecnico ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Muestras')}
            >
              <FlaskConical size={22} color={theme.colors.onPrimaryFixed} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Tomar Muestra</Text>
            </TouchableOpacity>
          ) : esAuditor ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Labores')}
            >
              <CalendarClock size={22} color={theme.colors.onPrimaryFixed} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Revisar Labores</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Registro')}
            >
              <Plus size={24} color={theme.colors.onPrimaryFixed} style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Nueva Finca</Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 67, 40, 0.65)' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    marginRight: 14,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardValue: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '600',
  },
  wideCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  wideCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  syncDesc: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryFixed,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  primaryButtonText: {
    color: theme.colors.onPrimaryFixed,
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ScreenOne;
