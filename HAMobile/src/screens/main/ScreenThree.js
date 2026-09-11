import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { eq } from 'drizzle-orm';
import {
  UserRound, Mail, Phone, CreditCard, Building2, LogOut, Users,
  CloudOff, CloudUpload, FileText, FlaskConical, Sprout, ClipboardCheck, ShieldCheck,
} from 'lucide-react-native';
import { theme } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../data/local/database';
import {
  fincas, documentosFinca, laboresLocales, ejecucionesLocales, muestrasLocales, empleados,
} from '../../data/local/esquema';

const INFO_ROL = {
  PRODUCTOR: { etiqueta: 'Productor', Icono: Sprout, color: theme.colors.primary },
  TECNICO_CAMPO: { etiqueta: 'Técnico de Campo', Icono: ClipboardCheck, color: theme.colors.secondary },
  AUDITOR_INTERNO: { etiqueta: 'Auditor Interno', Icono: ShieldCheck, color: theme.colors.tertiary },
};

/**
 * Perfil del usuario: identidad, rol, estado de sincronización local y
 * accesos rápidos de uso diario.
 */
const ScreenThree = ({ navigation }) => {
  const { user, signOut, isDemo } = useAuth();
  const insets = useSafeAreaInsets();
  const [pendientes, setPendientes] = useState({ total: 0, detalle: [] });

  const contarPendientes = useCallback(async () => {
    try {
      const sqlite = db();
      const tablas = [
        { tabla: fincas, etiqueta: 'Fincas' },
        { tabla: documentosFinca, etiqueta: 'Documentos' },
        { tabla: laboresLocales, etiqueta: 'Labores' },
        { tabla: ejecucionesLocales, etiqueta: 'Ejecuciones' },
        { tabla: muestrasLocales, etiqueta: 'Muestras' },
        { tabla: empleados, etiqueta: 'Empleados' },
      ];
      const detalle = [];
      let total = 0;
      for (const { tabla, etiqueta } of tablas) {
        const filas = await sqlite.select().from(tabla).where(eq(tabla.sync_status, 'pending'));
        if (filas.length > 0) {
          detalle.push({ etiqueta, cantidad: filas.length });
          total += filas.length;
        }
      }
      setPendientes({ total, detalle });
    } catch (e) {
      console.warn('[Perfil] Error contando pendientes:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { contarPendientes(); }, [contarPendientes]));

  const rol = INFO_ROL[user?.role_name] || { etiqueta: user?.role_name || 'Usuario', Icono: UserRound, color: theme.colors.primary };
  const RolIcono = rol.Icono;

  const filasInfo = [
    { Icono: Mail, etiqueta: 'Correo', valor: user?.email },
    { Icono: CreditCard, etiqueta: 'Cédula', valor: user?.identifier },
    { Icono: Phone, etiqueta: 'Teléfono', valor: user?.phone_number },
    { Icono: Building2, etiqueta: 'Organización', valor: user?.organizacion },
  ].filter((f) => f.valor);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <View style={styles.avatar}>
          <UserRound size={40} color={theme.colors.primary} />
        </View>
        <Text style={styles.nombre}>
          {user?.first_name} {user?.last_name}
        </Text>
        <View style={[styles.rolBadge, { backgroundColor: rol.color }]}>
          <RolIcono size={14} color="#fff" />
          <Text style={styles.rolBadgeText}>{rol.etiqueta}</Text>
        </View>
        {isDemo && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>MODO DEMOSTRACIÓN — datos locales de ejemplo</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        {/* Datos personales */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información personal</Text>
          {filasInfo.map(({ Icono, etiqueta, valor }) => (
            <View key={etiqueta} style={styles.infoRow}>
              <Icono size={18} color={theme.colors.onSurfaceVariant} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{etiqueta}</Text>
                <Text style={styles.infoValor}>{valor}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Estado de sincronización */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sincronización</Text>
          <View style={styles.infoRow}>
            {pendientes.total > 0
              ? <CloudOff size={20} color={theme.colors.secondary} />
              : <CloudUpload size={20} color={theme.colors.primary} />}
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoValor, { color: pendientes.total > 0 ? theme.colors.secondary : theme.colors.primary }]}>
                {pendientes.total > 0
                  ? `${pendientes.total} registros pendientes de subir`
                  : 'Todo sincronizado'}
              </Text>
              {pendientes.detalle.map((d) => (
                <Text key={d.etiqueta} style={styles.infoLabel}>
                  {d.etiqueta}: {d.cantidad}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Accesos rápidos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accesos rápidos</Text>

          <TouchableOpacity
            style={styles.accesoRow}
            onPress={() => navigation.navigate('Labores', { screen: 'Empleados' })}
          >
            <View style={[styles.accesoIcono, { backgroundColor: 'rgba(0, 67, 40, 0.08)' }]}>
              <Users size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accesoTitulo}>Mi cuadrilla</Text>
              <Text style={styles.accesoDesc}>Empleados y jornaleros para las labores</Text>
            </View>
          </TouchableOpacity>

          {user?.role_name === 'TECNICO_CAMPO' && (
            <TouchableOpacity
              style={styles.accesoRow}
              onPress={() => navigation.navigate('Muestras')}
            >
              <View style={[styles.accesoIcono, { backgroundColor: 'rgba(119, 90, 25, 0.1)' }]}>
                <FlaskConical size={20} color={theme.colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accesoTitulo}>Toma de muestras</Text>
                <Text style={styles.accesoDesc}>Registro de muestras de café en finca</Text>
              </View>
            </TouchableOpacity>
          )}

          {user?.role_name === 'PRODUCTOR' && (
            <TouchableOpacity
              style={styles.accesoRow}
              onPress={() => navigation.navigate('Registro')}
            >
              <View style={[styles.accesoIcono, { backgroundColor: 'rgba(99, 37, 39, 0.08)' }]}>
                <FileText size={20} color={theme.colors.tertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accesoTitulo}>Registrar nueva finca</Text>
                <Text style={styles.accesoDesc}>Con polígono GPS y expediente documental</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <LogOut size={18} color={theme.colors.error} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  nombre: { fontSize: 22, fontWeight: 'bold', color: theme.colors.onPrimary },
  rolBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginTop: 10,
  },
  rolBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  demoBadge: {
    backgroundColor: 'rgba(254, 212, 136, 0.9)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 12,
  },
  demoBadgeText: { fontSize: 10, fontWeight: '700', color: theme.colors.onSecondaryContainer, letterSpacing: 0.3 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  infoLabel: { fontSize: 12, color: theme.colors.onSurfaceVariant },
  infoValor: { fontSize: 15, fontWeight: '600', color: theme.colors.onSurface, marginTop: 1 },
  accesoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  accesoIcono: {
    width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  accesoTitulo: { fontSize: 15, fontWeight: '700', color: theme.colors.onSurface },
  accesoDesc: { fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: theme.colors.error,
    backgroundColor: '#fff', marginTop: 4,
  },
  logoutText: { color: theme.colors.error, fontSize: 15, fontWeight: '700' },
});

export default ScreenThree;
