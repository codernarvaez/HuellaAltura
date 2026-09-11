import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import {
  FlaskConical, Scale, MapPin, CheckCircle2, CloudOff, Coffee, Droplets, Sun,
} from 'lucide-react-native';
import { theme } from '../../../theme/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../data/local/database';
import { fincas as fincasSchema } from '../../../data/local/esquema';
import {
  MuestrasService, TIPOS_PROCESO, PESO_MUESTRA_KG, LB_A_KG, validarPesoMuestra,
} from '../../../services/MuestrasService';

const ICONO_PROCESO = {
  Lavado: Droplets,
  Honey: Coffee,
  Natural: Sun,
};

/**
 * Toma de muestras de café en finca (Módulo 3, RF-APE-01/02).
 * El peso se captura en libras y se valida con las mismas reglas del backend.
 */
export default function RegistroMuestraScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [fincas, setFincas] = useState([]);
  const [fincaId, setFincaId] = useState('');
  const [tipoProceso, setTipoProceso] = useState('Lavado');
  const [pesoLb, setPesoLb] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [historial, setHistorial] = useState([]);

  const cargar = useCallback(async () => {
    try {
      const locales = await db().select().from(fincasSchema);
      setFincas(locales);
      if (locales.length > 0 && !fincaId) setFincaId(locales[0].id);
      setHistorial(await MuestrasService.listar());
    } catch (e) {
      console.warn('[Muestras] Error cargando datos:', e);
    }
  }, [fincaId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const pesoEsperadoKg = PESO_MUESTRA_KG[tipoProceso];
  const pesoEsperadoLb = (pesoEsperadoKg / LB_A_KG).toFixed(2);
  const errorPeso = pesoLb ? validarPesoMuestra(tipoProceso, pesoLb) : null;
  const pesoValido = pesoLb && !errorPeso;

  const registrar = async () => {
    const finca = fincas.find((f) => f.id === fincaId);
    if (!finca) {
      Alert.alert('Falta la finca', 'Seleccione la finca donde se toma la muestra.');
      return;
    }
    const validacion = validarPesoMuestra(tipoProceso, pesoLb);
    if (validacion) {
      Alert.alert('Peso fuera de rango', validacion);
      return;
    }

    setEnviando(true);
    try {
      // Ubicación de la toma (si el usuario lo permite)
      let coords = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          coords = pos.coords;
        }
      } catch (e) { /* la muestra puede registrarse sin GPS */ }

      const resultado = await MuestrasService.registrar(finca, {
        tipoProceso,
        peso_lb: pesoLb,
        observaciones,
        productorId: finca.productor_id || user.id,
        latitud: coords?.latitude ?? null,
        longitud: coords?.longitude ?? null,
      });

      Alert.alert(
        'Muestra registrada',
        resultado.origen === 'local'
          ? 'La muestra quedó guardada en el dispositivo y se sincronizará al recuperar la conexión.'
          : 'La muestra fue registrada en el sistema de acopio.'
      );
      setPesoLb('');
      setObservaciones('');
      cargar();
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo registrar la muestra.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerIcon}>
          <FlaskConical size={22} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Toma de Muestras</Text>
          <Text style={styles.subtitle}>Café en finca · Módulo de acopio</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Finca de origen *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                style={{ color: theme.colors.onSurface }}
                dropdownIconColor={theme.colors.onSurface}
                selectedValue={fincaId}
                onValueChange={setFincaId}
              >
                {fincas.length === 0 && <Picker.Item label="Sin fincas registradas" value="" />}
                {fincas.map((f) => (
                  <Picker.Item key={f.id} label={`${f.nombre} (${f.canton || f.provincia})`} value={f.id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Tipo de proceso *</Text>
            <View style={styles.procesoRow}>
              {TIPOS_PROCESO.map((tipo) => {
                const Icono = ICONO_PROCESO[tipo];
                const activo = tipoProceso === tipo;
                return (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.procesoChip, activo && styles.procesoChipActivo]}
                    onPress={() => setTipoProceso(tipo)}
                    activeOpacity={0.8}
                  >
                    <Icono size={18} color={activo ? '#fff' : theme.colors.primary} />
                    <Text style={[styles.procesoChipText, activo && styles.procesoChipTextActivo]}>{tipo}</Text>
                    <Text style={[styles.procesoChipPeso, activo && styles.procesoChipTextActivo]}>
                      {PESO_MUESTRA_KG[tipo]} kg
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Peso capturado (libras) *</Text>
            <View style={[styles.pesoBox, pesoLb ? (pesoValido ? styles.pesoBoxOk : styles.pesoBoxError) : null]}>
              <Scale size={20} color={pesoLb ? (pesoValido ? theme.colors.primary : theme.colors.error) : theme.colors.outline} />
              <TextInput
                style={styles.pesoInput}
                value={pesoLb}
                onChangeText={setPesoLb}
                keyboardType="decimal-pad"
                placeholder={`Objetivo: ${pesoEsperadoLb} lb (±10 %)`}
                placeholderTextColor={theme.colors.outline}
              />
              <Text style={styles.pesoUnidad}>lb</Text>
            </View>
            {pesoLb ? (
              <Text style={[styles.pesoFeedback, { color: pesoValido ? theme.colors.primary : theme.colors.error }]}>
                {pesoValido
                  ? `✓ Equivale a ${(parseFloat(pesoLb.replace(',', '.')) * LB_A_KG).toFixed(2)} kg — dentro del rango para ${tipoProceso}`
                  : errorPeso}
              </Text>
            ) : (
              <Text style={styles.pesoHint}>
                {tipoProceso} requiere {pesoEsperadoKg} kg ≈ {pesoEsperadoLb} lb en báscula.
              </Text>
            )}

            <Text style={styles.inputLabel}>Observaciones</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              multiline
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Lote, estado del grano, condiciones de la toma..."
              placeholderTextColor={theme.colors.outline}
            />

            <View style={styles.gpsRow}>
              <MapPin size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.gpsText}>
                La ubicación GPS se adjunta automáticamente para el vínculo geoespacial (RF-APE-02).
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, !pesoValido && styles.submitBtnDisabled]}
              onPress={registrar}
              disabled={enviando || !pesoValido}
            >
              {enviando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Registrar Muestra</Text>}
            </TouchableOpacity>
          </View>

          {historial.length > 0 && (
            <>
              <Text style={styles.historialTitulo}>Muestras registradas en el dispositivo</Text>
              {historial.map((m) => (
                <View key={m.id} style={styles.historialCard}>
                  <View style={styles.historialIcono}>
                    {m.sync_status === 'synced'
                      ? <CheckCircle2 size={20} color={theme.colors.primary} />
                      : <CloudOff size={20} color={theme.colors.secondary} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historialNombre}>
                      {m.finca_nombre || 'Finca'} · {m.tipo_proceso}
                    </Text>
                    <Text style={styles.historialDetalle}>
                      {m.peso_lb} lb ({(m.peso_lb * LB_A_KG).toFixed(2)} kg)
                      {m.sync_status === 'pending' ? ' · Pendiente de sincronizar' : ' · Sincronizada'}
                    </Text>
                    {m.observaciones ? <Text style={styles.historialObs}>{m.observaciones}</Text> : null}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.inversePrimary,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.onPrimary },
  subtitle: { fontSize: 13, color: theme.colors.primaryFixedDim },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  inputLabel: {
    fontSize: 13, fontWeight: '600', color: theme.colors.onSurfaceVariant,
    marginBottom: 6, marginTop: 14,
  },
  pickerContainer: {
    borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 10,
    backgroundColor: theme.colors.surface,
  },
  procesoRow: { flexDirection: 'row', gap: 8 },
  procesoChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: theme.colors.primary, backgroundColor: '#fff', gap: 4,
  },
  procesoChipActivo: { backgroundColor: theme.colors.primary },
  procesoChipText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  procesoChipPeso: { fontSize: 11, color: theme.colors.onSurfaceVariant },
  procesoChipTextActivo: { color: '#fff' },
  pesoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: theme.colors.outlineVariant, borderRadius: 12,
    paddingHorizontal: 14, backgroundColor: theme.colors.surface,
  },
  pesoBoxOk: { borderColor: theme.colors.primary },
  pesoBoxError: { borderColor: theme.colors.error },
  pesoInput: { flex: 1, height: 52, fontSize: 18, fontWeight: '600', color: theme.colors.onSurface },
  pesoUnidad: { fontSize: 15, fontWeight: '700', color: theme.colors.onSurfaceVariant },
  pesoFeedback: { fontSize: 12, marginTop: 6, lineHeight: 16 },
  pesoHint: { fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 6 },
  input: {
    borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    backgroundColor: theme.colors.surface, color: theme.colors.onSurface,
  },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  gpsText: { flex: 1, fontSize: 11, color: theme.colors.onSurfaceVariant, lineHeight: 15 },
  submitBtn: {
    backgroundColor: theme.colors.primary, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginTop: 16,
  },
  submitBtnDisabled: { backgroundColor: theme.colors.outlineVariant },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  historialTitulo: {
    fontSize: 15, fontWeight: '700', color: theme.colors.onSurface,
    marginTop: 24, marginBottom: 12,
  },
  historialCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  historialIcono: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  historialNombre: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  historialDetalle: { fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 },
  historialObs: { fontSize: 12, color: theme.colors.outline, marginTop: 4, fontStyle: 'italic' },
});
