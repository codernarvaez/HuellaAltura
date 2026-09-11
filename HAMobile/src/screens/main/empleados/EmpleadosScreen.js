import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChevronLeft, Plus, Users, UserRound, Phone, BadgeDollarSign, ShieldAlert, UserX,
} from 'lucide-react-native';
import { theme } from '../../../theme/theme';
import { useAuth } from '../../../contexts/AuthContext';
import { EmpleadosService, EDAD_MINIMA_EMPLEADO } from '../../../services/EmpleadosService';

/**
 * Gestión de la cuadrilla de trabajo del productor (RF PPC-04/05).
 * Los empleados creados aquí se seleccionan al ejecutar una labor.
 */
export default function EmpleadosScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [edad, setEdad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [salario, setSalario] = useState('');
  const [errorForm, setErrorForm] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const filas = await EmpleadosService.listar(user.id);
      setLista(filas);
    } catch (e) {
      console.warn('[EmpleadosScreen] Error cargando empleados:', e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const abrirCrear = () => {
    setNombre(''); setCedula(''); setEdad(''); setTelefono(''); setSalario('');
    setErrorForm('');
    setModalVisible(true);
  };

  const guardar = async () => {
    setGuardando(true);
    setErrorForm('');
    try {
      const resultado = await EmpleadosService.crear(user.id, {
        nombre, cedula, edad, telefono, salario_jornal: salario,
      });
      if (resultado.error) {
        setErrorForm(resultado.error);
        return;
      }
      setModalVisible(false);
      cargar();
    } catch (e) {
      setErrorForm('No se pudo guardar el empleado.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarBaja = (empleado) => {
    Alert.alert(
      'Retirar empleado',
      `¿Retirar a ${empleado.nombre} de la cuadrilla activa? Su historial de labores se conserva.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Retirar',
          style: 'destructive',
          onPress: async () => {
            await EmpleadosService.desactivar(empleado.id);
            cargar();
          },
        },
      ]
    );
  };

  const renderEmpleado = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <UserRound size={24} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nombre}>{item.nombre}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{item.edad} años</Text>
          {item.cedula ? <Text style={styles.meta}> · CI {item.cedula}</Text> : null}
        </View>
        <View style={styles.metaRow}>
          {item.telefono ? (
            <View style={styles.metaChip}>
              <Phone size={12} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.metaChipText}>{item.telefono}</Text>
            </View>
          ) : null}
          {item.salario_jornal != null ? (
            <View style={styles.metaChip}>
              <BadgeDollarSign size={12} color={theme.colors.secondary} />
              <Text style={styles.metaChipText}>${item.salario_jornal.toFixed(2)}/jornal</Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        style={styles.bajaBtn}
        onPress={() => confirmarBaja(item)}
        accessibilityLabel={`Retirar a ${item.nombre}`}
      >
        <UserX size={20} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <ChevronLeft size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mi Cuadrilla</Text>
          <Text style={styles.subtitle}>Empleados y jornaleros</Text>
        </View>
        <TouchableOpacity onPress={abrirCrear} style={styles.addButton} accessibilityLabel="Agregar empleado">
          <Plus size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.noticeBox}>
        <ShieldAlert size={16} color={theme.colors.secondary} />
        <Text style={styles.noticeText}>
          Solo se pueden registrar trabajadores mayores de {EDAD_MINIMA_EMPLEADO} años
          (normativa de Comercio Justo).
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          renderItem={renderEmpleado}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyTitle}>Sin empleados registrados</Text>
              <Text style={styles.emptyText}>
                Agrega a tu cuadrilla para seleccionarlos al ejecutar labores.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={abrirCrear}>
                <Plus size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyBtnText}>Agregar empleado</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo empleado</Text>

            {errorForm ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorForm}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Nombre completo *</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Juan Pérez Cueva"
              placeholderTextColor={theme.colors.outline}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Edad *</Text>
                <TextInput
                  style={styles.input}
                  value={edad}
                  onChangeText={setEdad}
                  keyboardType="number-pad"
                  placeholder="Ej. 34"
                  placeholderTextColor={theme.colors.outline}
                />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.inputLabel}>Cédula</Text>
                <TextInput
                  style={styles.input}
                  value={cedula}
                  onChangeText={setCedula}
                  keyboardType="number-pad"
                  placeholder="Opcional"
                  placeholderTextColor={theme.colors.outline}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                  placeholder="Opcional"
                  placeholderTextColor={theme.colors.outline}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Salario/jornal ($)</Text>
                <TextInput
                  style={styles.input}
                  value={salario}
                  onChangeText={setSalario}
                  keyboardType="decimal-pad"
                  placeholder="Ej. 15.00"
                  placeholderTextColor={theme.colors.outline}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={guardar} disabled={guardando}>
                {guardando
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.onPrimary },
  subtitle: { fontSize: 14, color: theme.colors.primaryFixedDim },
  addButton: {
    width: 40, height: 40, backgroundColor: theme.colors.inversePrimary,
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  noticeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(254, 212, 136, 0.25)',
    marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(119, 90, 25, 0.2)',
  },
  noticeText: { flex: 1, fontSize: 12, color: theme.colors.onSecondaryContainer, lineHeight: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0, 67, 40, 0.08)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  nombre: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 },
  meta: { fontSize: 13, color: theme.colors.onSurfaceVariant },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.surface, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  metaChipText: { fontSize: 12, color: theme.colors.onSurfaceVariant },
  bajaBtn: { padding: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.onSurface, marginTop: 16 },
  emptyText: {
    fontSize: 14, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 12 },
  errorBox: {
    backgroundColor: theme.colors.errorContainer, borderRadius: 10,
    padding: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.error,
  },
  errorText: { color: theme.colors.onErrorContainer, fontSize: 12, lineHeight: 16 },
  inputLabel: {
    fontSize: 13, fontWeight: '600', color: theme.colors.onSurfaceVariant,
    marginBottom: 6, marginTop: 12,
  },
  input: {
    borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    backgroundColor: theme.colors.surface, color: theme.colors.onSurface,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 24, borderWidth: 1,
    borderColor: theme.colors.outlineVariant, justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: { color: theme.colors.onSurfaceVariant, fontWeight: '600' },
  saveBtn: {
    flex: 1, height: 48, borderRadius: 24, backgroundColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
