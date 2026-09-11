import React, { useState, useEffect, useRef } from 'react';
import { Picker } from '@react-native-picker/picker';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../theme/theme';
import { ChevronLeft, Plus, Calendar, CheckCircle2, Clock, PlayCircle, Camera as CameraIcon, Leaf, Trash2, Users } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import ViewShot from 'react-native-view-shot';
import { db } from '../../../data/local/database';
import * as schema from '../../../data/local/esquema';
import { eq } from 'drizzle-orm';
import { useAuth } from '../../../contexts/AuthContext';
import { LaboresService } from '../../../services/LaboresService';
import { EmpleadosService, EDAD_MINIMA_EMPLEADO } from '../../../services/EmpleadosService';

// Roles que pueden aprobar auditorías de labores (espejo del RBAC del backend)
const ROLES_APROBADOR = ['AUDITOR_INTERNO', 'TENANT_ADMIN', 'SUPER_ADMIN'];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CalendarioLaboresScreen({ route, navigation }) {
  const { finca } = route.params;
  const { user } = useAuth();
  const puedeAprobar = ROLES_APROBADOR.includes(user?.role_name);
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMes, setSelectedMes] = useState(MESES[new Date().getMonth()]);
  const [viewMode, setViewMode] = useState('GRID');
  const insets = useSafeAreaInsets();
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('AGENDAR'); // AGENDAR or EJECUTAR
  const [selectedLabor, setSelectedLabor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Agendar
  const [nombreForm, setNombreForm] = useState('');
  const [tipoProcesoForm, setTipoProcesoForm] = useState('');
  const [cantidadProyectadaForm, setCantidadProyectadaForm] = useState('');
  const [mesForm, setMesForm] = useState(MESES[new Date().getMonth()]);
  const [sugerenciasList, setSugerenciasList] = useState([]);

  // Form State - Ejecutar
  const [personaDesarrollo, setPersonaDesarrollo] = useState('TITULAR');
  const [empleadosLista, setEmpleadosLista] = useState([]);
  const [empleadoId, setEmpleadoId] = useState('');
  const [nombreJornalero, setNombreJornalero] = useState('');
  const [edadJornalero, setEdadJornalero] = useState('');
  const [diasTrabajo, setDiasTrabajo] = useState('');
  const [detalleAplicacion, setDetalleAplicacion] = useState('');
  const [salario, setSalario] = useState('');
  const [herramientas, setHerramientas] = useState('');
  // Lista de insumos ya agregados a la ejecución (el backend acepta N insumos por ejecución)
  const [insumos, setInsumos] = useState([]);
  // Borrador del insumo que se está capturando en la fila de entrada
  const [insumoNombre, setInsumoNombre] = useState('');
  const [insumoCantidad, setInsumoCantidad] = useState('');
  const [insumoUnidad, setInsumoUnidad] = useState('');
  const [fotoUri, setFotoUri] = useState(null);
  const [locationData, setLocationData] = useState(null);

  useEffect(() => {
    fetchLabores();
  }, []);

  useEffect(() => {
    if (modalMode === 'AGENDAR') {
      fetchSugerencias(mesForm);
    }
  }, [mesForm, modalMode]);

  const fetchSugerencias = async (mes) => {
    try {
      // Intentar obtener las actividades ricas desde la base de datos local SQLite para disponibilidad offline y llenado automático de formulario
      const localData = await db().select().from(schema.actividadesTrazabilidad).where(eq(schema.actividadesTrazabilidad.mes, mes));
      if (localData && localData.length > 0) {
        // Mapear los datos de SQLite al formato que espera el frontend (usando `nombre` en vez de `actividad` por consistencia)
        const mapped = localData.map(d => ({
          nombre: d.actividad,
          tipo_proceso: d.etapa,
          cantidad_ha: d.cantidadHa,
          unidad: d.unidad,
          detalle: d.detalleTecnico,
          insumos: d.insumos,
          herramientas: d.herramientas
        }));
        setSugerenciasList(mapped);
        return;
      }

      setSugerenciasList([]);
    } catch (error) {
      console.warn('Error fetching sugerencias:', error);
    }
  };

  const fetchLabores = async () => {
    setLoading(true);
    try {
      const lista = await LaboresService.getCalendario(finca.id);
      setLabores(lista);
    } catch (error) {
      console.warn('Error fetching labores:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombreForm('');
    setTipoProcesoForm('');
    setCantidadProyectadaForm('');
    setPersonaDesarrollo('TITULAR');
    setEmpleadoId('');
    setNombreJornalero('');
    setEdadJornalero('');
    setDiasTrabajo('');
    setDetalleAplicacion('');
    setSalario('');
    setHerramientas('');
    setInsumos([]);
    limpiarBorradorInsumo();
    setFotoUri(null);
    setLocationData(null);
  };

  const limpiarBorradorInsumo = () => {
    setInsumoNombre('');
    setInsumoCantidad('');
    setInsumoUnidad('');
  };

  // Valida el borrador de insumo. Devuelve { vacio } si no se escribió nada,
  // { error } si está incompleto o { insumo } si es válido.
  const construirInsumoDesdeBorrador = () => {
    const nombre = insumoNombre.trim();
    const cantidadTexto = insumoCantidad.trim();
    const unidad = insumoUnidad.trim();

    if (!nombre && !cantidadTexto && !unidad) return { vacio: true };

    if (!nombre) return { error: 'Indique el nombre del insumo.' };

    const cantidad = parseFloat(cantidadTexto.replace(',', '.'));
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { error: 'La cantidad del insumo debe ser un número mayor a 0.' };
    }

    if (!unidad) return { error: 'Indique la unidad del insumo (Ej. kg, L, unidad).' };

    return { insumo: { nombre, cantidad, unidad } };
  };

  const agregarInsumo = () => {
    const resultado = construirInsumoDesdeBorrador();
    if (resultado.vacio) {
      Alert.alert('Insumo incompleto', 'Complete nombre, cantidad y unidad para agregar el insumo.');
      return;
    }
    if (resultado.error) {
      Alert.alert('Insumo inválido', resultado.error);
      return;
    }

    const { insumo } = resultado;
    const duplicado = insumos.some(
      (i) => i.nombre.toLowerCase() === insumo.nombre.toLowerCase() && i.unidad.toLowerCase() === insumo.unidad.toLowerCase()
    );
    if (duplicado) {
      Alert.alert('Insumo repetido', `"${insumo.nombre}" ya fue agregado con la misma unidad. Elimínelo primero si desea corregir la cantidad.`);
      return;
    }

    setInsumos((prev) => [...prev, insumo]);
    limpiarBorradorInsumo();
  };

  const eliminarInsumo = (index) => {
    setInsumos((prev) => prev.filter((_, i) => i !== index));
  };

  const openAgendar = () => {
    resetForm();
    setModalMode('AGENDAR');
    setModalVisible(true);
  };

  const openEjecutar = async (labor) => {
    resetForm();
    setSelectedLabor(labor);
    setModalMode('EJECUTAR');
    setModalVisible(true);
    try {
      const cuadrilla = await EmpleadosService.listar(user.id);
      setEmpleadosLista(cuadrilla);
    } catch (e) {
      setEmpleadosLista([]);
    }
  };

  // Al elegir un empleado del catálogo se prellenan sus datos
  const seleccionarEmpleado = (id) => {
    setEmpleadoId(id);
    if (!id || id === 'MANUAL') {
      setNombreJornalero('');
      setEdadJornalero('');
      return;
    }
    const empleado = empleadosLista.find((e) => e.id === id);
    if (empleado) {
      setNombreJornalero(empleado.nombre);
      setEdadJornalero(String(empleado.edad));
      if (empleado.salario_jornal != null && !salario) {
        setSalario(String(empleado.salario_jornal));
      }
    }
  };

  const viewShotRef = useRef(null);

  const takePhoto = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requiere permiso de cámara para capturar la evidencia.');
      return;
    }

    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    if (locationStatus !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requiere permiso de ubicación para la marca de agua.');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.5,
      });

      if (!result.canceled) {
        setFotoUri(result.assets[0].uri);
        setLocationData({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date().toLocaleString()
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto o acceder a la ubicación.');
    }
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    try {
      if (modalMode === 'AGENDAR') {
        if (!nombreForm || !tipoProcesoForm || !cantidadProyectadaForm) {
          Alert.alert('Error', 'Llene los campos obligatorios.');
          return;
        }

        const resultado = await LaboresService.agendar(finca.id, {
          nombre: nombreForm,
          tipo_proceso: tipoProcesoForm,
          mes: mesForm,
          cantidad_proyectada: cantidadProyectadaForm,
        });

        Alert.alert(
          'Éxito',
          resultado.origen === 'local'
            ? 'Labor agendada localmente. Se sincronizará al recuperar la conexión.'
            : 'Labor agendada correctamente.'
        );
        setModalVisible(false);
        setSelectedMes(mesForm);
        fetchLabores();
        return;
      }

      // EJECUTAR
      if (personaDesarrollo === 'JORNALERO') {
        if (!nombreJornalero.trim()) {
          Alert.alert('Falta el jornalero', 'Seleccione un empleado de su cuadrilla o escriba su nombre.');
          return;
        }
        const edad = parseInt(edadJornalero, 10);
        if (!Number.isFinite(edad) || edad <= 0) {
          Alert.alert('Falta la edad', 'Indique la edad del jornalero: la normativa exige verificar que sea mayor de edad.');
          return;
        }
        if (edad < EDAD_MINIMA_EMPLEADO) {
          Alert.alert(
            'Registro no permitido',
            `El jornalero debe tener al menos ${EDAD_MINIMA_EMPLEADO} años. El trabajo infantil está prohibido por la normativa de Comercio Justo.`
          );
          return;
        }
      }

      if (!fotoUri || !locationData || !viewShotRef.current) {
        Alert.alert('Error', 'Debe capturar la imagen con ubicación para ejecutar la labor.');
        return;
      }

      // El insumo que quedó escrito en la fila de captura sin presionar "Agregar"
      // se incluye igual, para no descartar datos del usuario en silencio.
      const borradorInsumo = construirInsumoDesdeBorrador();
      if (borradorInsumo.error) {
        Alert.alert('Insumo inválido', borradorInsumo.error);
        return;
      }
      const insumosPayload = borradorInsumo.insumo ? [...insumos, borradorInsumo.insumo] : insumos;

      // Captura de la imagen con marca de agua como archivo temporal
      const capturedUri = await viewShotRef.current.capture();

      const esJornalero = personaDesarrollo === 'JORNALERO';
      const resultado = await LaboresService.ejecutar(
        { ...selectedLabor, finca_id: selectedLabor.finca_id || finca.id },
        {
          persona_desarrollo: personaDesarrollo || 'TITULAR',
          empleado_id: esJornalero && empleadoId && empleadoId !== 'MANUAL' ? empleadoId : null,
          nombre_jornalero: esJornalero ? nombreJornalero.trim() : null,
          edad_jornalero: esJornalero ? parseInt(edadJornalero, 10) : null,
          dias_trabajo: diasTrabajo ? parseFloat(diasTrabajo.replace(',', '.')) : null,
          detalle_aplicacion: detalleAplicacion,
          salario: parseFloat(salario) || 0,
          insumos: insumosPayload,
          herramientas: herramientas.split(',').map((s) => s.trim()).filter(Boolean),
        },
        {
          fotoUri: capturedUri,
          latitud: locationData.latitude,
          longitud: locationData.longitude,
          watermark: `Fecha: ${locationData.timestamp} | Lat: ${locationData.latitude} | Lon: ${locationData.longitude}`,
        }
      );

      Alert.alert(
        'Éxito',
        resultado.origen === 'local'
          ? 'Ejecución registrada localmente con su evidencia. Se sincronizará al recuperar la conexión.'
          : 'Labor ejecutada correctamente.'
      );
      setModalVisible(false);
      fetchLabores();
    } catch (error) {
      Alert.alert('Error', error.message || 'Error de red.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validarNorma = async (laborId) => {
    try {
      const data = await LaboresService.validarNorma(laborId);
      Alert.alert(
        'Validación Normativa',
        `Estado: ${data.estado_validacion}\nOrgánico: ${data.detalles?.organico?.observacion}\nComercio Justo: ${data.detalles?.comercio_justo?.observacion}`
      );
      fetchLabores();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo validar la norma.');
    }
  };

  const aprobarLabor = async (laborId) => {
    try {
      await LaboresService.aprobar(laborId);
      Alert.alert('Éxito', 'Labor auditada y aprobada correctamente.');
      fetchLabores();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo aprobar la labor.');
    }
  };

  const laboresDelMes = labores.filter(l => l.mes?.toLowerCase() === selectedMes.toLowerCase());
  
  // Agrupar por estado
  const planificados = laboresDelMes.filter(l => !l.estado || l.estado === 'PLANIFICADO');
  const ejecutados = laboresDelMes.filter(l => l.estado === 'EJECUTADO');
  const validados = laboresDelMes.filter(l => l.estado === 'PRE_VALIDADO' || l.estado === 'AUDITADO');

  const renderLaborCard = (labor, statusColor, icon) => (
    <View key={labor.id || Math.random().toString()} style={[styles.laborCard, { borderLeftColor: statusColor }]}>
      <View style={styles.laborHeader}>
        <Text style={styles.laborName}>{labor.nombre}</Text>
        {icon}
      </View>
      <Text style={styles.laborText}>Proceso: {labor.tipo_proceso}</Text>
      <Text style={styles.laborText}>Cantidad: {labor.cantidad_proyectada}</Text>
      {(!labor.estado || labor.estado === 'PLANIFICADO') && (
        <TouchableOpacity style={styles.ejecutarBtn} onPress={() => openEjecutar(labor)}>
          <PlayCircle size={14} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.ejecutarBtnText}>Iniciar Ejecución</Text>
        </TouchableOpacity>
      )}
      {labor.estado === 'EJECUTADO' && (
        <TouchableOpacity style={[styles.ejecutarBtn, { backgroundColor: '#F59E0B' }]} onPress={() => validarNorma(labor.id)}>
          <CheckCircle2 size={14} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.ejecutarBtnText}>Validar Norma</Text>
        </TouchableOpacity>
      )}
      {(labor.estado === 'PRE_VALIDADO' || labor.estado === 'AUDITADO') && (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <CheckCircle2 size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: 'bold' }}>
              {labor.estado === 'AUDITADO' ? 'Labor Auditada y Aprobada' : 'Pre-Validada (Cumple Normativa)'}
            </Text>
          </View>
          {labor.estado === 'PRE_VALIDADO' && (
            puedeAprobar ? (
              <TouchableOpacity style={[styles.ejecutarBtn, { backgroundColor: theme.colors.primary }]} onPress={() => aprobarLabor(labor.id)}>
                <CheckCircle2 size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.ejecutarBtnText}>Aprobar (Auditor)</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                Pendiente de aprobación por el auditor interno
              </Text>
            )
          )}
        </View>
      )}
    </View>
  );

  const getLaboresCount = (mes) => labores.filter(l => l.mes?.toLowerCase() === mes.toLowerCase()).length;

  return (
    <View style={{ flex: 1, backgroundColor: viewMode === 'GRID' ? theme.colors.inverseSurface : theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => viewMode === 'MONTH_DETAIL' ? setViewMode('GRID') : navigation.goBack()} style={{ padding: 8 }}>
          <ChevronLeft size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{viewMode === 'GRID' ? finca.nombre : `${selectedMes} - ${finca.nombre}`}</Text>
          <Text style={styles.subtitle}>{viewMode === 'GRID' ? 'Calendario de Labores' : 'Labores del mes'}</Text>
        </View>
        {viewMode === 'MONTH_DETAIL' && (
          <TouchableOpacity onPress={openAgendar} style={styles.addButton}>
            <Plus size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {viewMode === 'GRID' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'center' }}>
          <View style={styles.gridContainer}>
            {MESES.map(mes => {
              const count = getLaboresCount(mes);
              return (
                <TouchableOpacity
                  key={mes}
                  style={[styles.monthCard, count > 0 && styles.monthCardActive]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedMes(mes);
                    setViewMode('MONTH_DETAIL');
                  }}
                >
                  <Text style={styles.monthWatermark}>{mes.substring(0, 3).toUpperCase()}</Text>
                  <View style={styles.monthCardContent}>
                    <Text style={[styles.monthName, count > 0 && styles.monthNameActive]}>{mes}</Text>
                    {count > 0 ? (
                      <View style={styles.taskIndicatorContainer}>
                        <Leaf size={12} color={theme.colors.primary} />
                        <Text style={styles.taskCountText}>{count} {count === 1 ? 'Labor' : 'Labores'}</Text>
                      </View>
                    ) : (
                      <View style={styles.taskIndicatorContainerEmpty}>
                        <Calendar size={12} color={theme.colors.outline} />
                        <Text style={styles.noTaskText}>Libre</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
          ) : laboresDelMes.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Calendar size={48} color={theme.colors.outlineVariant} />
              <Text style={{ color: theme.colors.outline, marginTop: 12, fontSize: 16 }}>No hay labores para {selectedMes}</Text>
            </View>
          ) : (
            <>
              {planificados.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Planificadas ({planificados.length})</Text>
                  {planificados.map(l => renderLaborCard(l, '#94a3b8', <Clock size={20} color="#94a3b8" />))}
                </View>
              )}
              {ejecutados.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Ejecutadas ({ejecutados.length})</Text>
                  {ejecutados.map(l => renderLaborCard(l, '#F59E0B', <PlayCircle size={20} color="#F59E0B" />))}
                </View>
              )}
              {validados.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Validadas ({validados.length})</Text>
                  {validados.map(l => renderLaborCard(l, theme.colors.primary, <CheckCircle2 size={20} color={theme.colors.primary} />))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Modal para Agendar o Ejecutar */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.floatingModalContent}>
            <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalMode === 'AGENDAR' ? `Agendar Labor (${selectedMes})` : 'Ejecutar Labor'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 20 }}>
            {modalMode === 'AGENDAR' ? (
              <>
                <Text style={styles.inputLabel}>Mes programado *</Text>
                <View style={styles.pickerContainer}>
                  <Picker style={{ color: theme.colors.onSurface }} dropdownIconColor={theme.colors.onSurface} selectedValue={mesForm} onValueChange={(val) => { setMesForm(val); }}>
                    {MESES.map(m => <Picker.Item key={m} label={m} value={m} />)}
                  </Picker>
                </View>

                <Text style={styles.inputLabel}>Actividad *</Text>
                <View style={styles.pickerContainer}>
                  <Picker style={{ color: theme.colors.onSurface }} dropdownIconColor={theme.colors.onSurface} selectedValue={nombreForm} onValueChange={(val) => {
                    setNombreForm(val);
                    const act = sugerenciasList.find(a => a.nombre === val);
                    if (act) {
                      setTipoProcesoForm(act.tipo_proceso);
                      if (act.cantidad_ha && act.unidad) {
                        setCantidadProyectadaForm(`${act.cantidad_ha} ${act.unidad}`);
                      } else {
                        setCantidadProyectadaForm('');
                      }
                    }
                  }}>
                    <Picker.Item label="Seleccione una actividad..." value="" />
                    {sugerenciasList.map((a, i) => (
                      <Picker.Item key={i} label={a.nombre} value={a.nombre} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.inputLabel}>Etapa *</Text>
                <TextInput style={styles.input} value={tipoProcesoForm} onChangeText={setTipoProcesoForm} placeholder="Ej. Producción" placeholderTextColor={theme.colors.outline} />

                <Text style={styles.inputLabel}>Cantidad Proyectada *</Text>
                <TextInput style={styles.input} value={cantidadProyectadaForm} onChangeText={setCantidadProyectadaForm} placeholder="Ej. 2 hectáreas" placeholderTextColor={theme.colors.outline} />
              </>
            ) : (
              <>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: theme.colors.onSurface }}>Labor: {selectedLabor?.nombre}</Text>
                <Text style={{ fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>Mes programado: {selectedLabor?.mes} (Visual)</Text>

                <Text style={styles.inputLabel}>Persona que desarrolla (Roles)</Text>
                <View style={styles.pickerContainer}>
                  <Picker style={{ color: theme.colors.onSurface }} dropdownIconColor={theme.colors.onSurface} selectedValue={personaDesarrollo} onValueChange={setPersonaDesarrollo}>
                    <Picker.Item label="TITULAR" value="TITULAR" />
                    <Picker.Item label="JORNALERO" value="JORNALERO" />
                    <Picker.Item label="TECNICO CAMPO" value="TECNICO_CAMPO" />
                    <Picker.Item label="TERCERO" value="TERCERO" />
                  </Picker>
                </View>

                {personaDesarrollo === 'JORNALERO' && (
                  <View style={styles.jornaleroBox}>
                    <View style={styles.jornaleroHeader}>
                      <Users size={16} color={theme.colors.primary} />
                      <Text style={styles.jornaleroTitle}>Datos del jornalero</Text>
                      <TouchableOpacity onPress={() => { setModalVisible(false); navigation.navigate('Empleados'); }}>
                        <Text style={styles.jornaleroLink}>Gestionar cuadrilla</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.inputLabel}>Empleado *</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        style={{ color: theme.colors.onSurface }}
                        dropdownIconColor={theme.colors.onSurface}
                        selectedValue={empleadoId}
                        onValueChange={seleccionarEmpleado}
                      >
                        <Picker.Item label="Seleccione de su cuadrilla..." value="" />
                        {empleadosLista.map((e) => (
                          <Picker.Item key={e.id} label={`${e.nombre} (${e.edad} años)`} value={e.id} />
                        ))}
                        <Picker.Item label="✏️ Escribir manualmente" value="MANUAL" />
                      </Picker>
                    </View>

                    {(empleadoId === 'MANUAL' || empleadosLista.length === 0) && (
                      <>
                        <Text style={styles.inputLabel}>Nombre del jornalero *</Text>
                        <TextInput style={styles.input} value={nombreJornalero} onChangeText={setNombreJornalero} placeholder="Ej. Juan Pérez" placeholderTextColor={theme.colors.outline} />
                        <Text style={styles.inputLabel}>Edad * (mínimo {EDAD_MINIMA_EMPLEADO} años)</Text>
                        <TextInput style={styles.input} value={edadJornalero} onChangeText={setEdadJornalero} keyboardType="number-pad" placeholder="Ej. 34" placeholderTextColor={theme.colors.outline} />
                      </>
                    )}

                    {empleadoId && empleadoId !== 'MANUAL' && nombreJornalero ? (
                      <View style={styles.jornaleroResumen}>
                        <Text style={styles.jornaleroResumenText}>
                          {nombreJornalero} · {edadJornalero} años
                        </Text>
                      </View>
                    ) : null}

                    <Text style={styles.inputLabel}>Días de trabajo</Text>
                    <TextInput style={styles.input} value={diasTrabajo} onChangeText={setDiasTrabajo} keyboardType="decimal-pad" placeholder="Ej. 2" placeholderTextColor={theme.colors.outline} />
                  </View>
                )}

                <Text style={styles.inputLabel}>Detalle de aplicación</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} multiline value={detalleAplicacion} onChangeText={setDetalleAplicacion} placeholder="Detalles..." placeholderTextColor={theme.colors.outline} />

                <Text style={styles.inputLabel}>Salario (opcional)</Text>
                <TextInput style={styles.input} value={salario} onChangeText={setSalario} keyboardType="numeric" placeholder="Ej. 15.00" placeholderTextColor={theme.colors.outline} />

                <Text style={styles.inputLabel}>Herramientas (separadas por coma)</Text>
                <TextInput style={styles.input} value={herramientas} onChangeText={setHerramientas} placeholder="Ej. Machete, Tijeras" placeholderTextColor={theme.colors.outline} />

                <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: theme.colors.onSurface }}>
                  Insumos (Opcional){insumos.length > 0 ? ` · ${insumos.length}` : ''}
                </Text>

                {insumos.map((insumo, index) => (
                  <View key={`${insumo.nombre}-${insumo.unidad}-${index}`} style={styles.insumoItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.insumoItemNombre}>{insumo.nombre}</Text>
                      <Text style={styles.insumoItemDetalle}>{insumo.cantidad} {insumo.unidad}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.insumoDeleteBtn}
                      onPress={() => eliminarInsumo(index)}
                      accessibilityLabel={`Eliminar insumo ${insumo.nombre}`}
                    >
                      <Trash2 size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput style={[styles.input, { flex: 2 }]} value={insumoNombre} onChangeText={setInsumoNombre} placeholder="Nombre" placeholderTextColor={theme.colors.outline} />
                  <TextInput style={[styles.input, { flex: 1 }]} value={insumoCantidad} onChangeText={setInsumoCantidad} keyboardType="numeric" placeholder="Cant." placeholderTextColor={theme.colors.outline} />
                  <TextInput style={[styles.input, { flex: 1 }]} value={insumoUnidad} onChangeText={setInsumoUnidad} placeholder="Unid." placeholderTextColor={theme.colors.outline} />
                  <TouchableOpacity style={styles.insumoAddBtn} onPress={agregarInsumo} accessibilityLabel="Agregar insumo">
                    <Plus size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.insumoHint}>Complete los tres campos y pulse + para agregar otro insumo.</Text>

                <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 24, marginBottom: 8 }}>Evidencia Fotográfica *</Text>
                <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
                  <CameraIcon size={24} color="#fff" />
                  <Text style={styles.cameraBtnText}>{fotoUri ? 'Cambiar Foto' : 'Tomar Foto con Ubicación'}</Text>
                </TouchableOpacity>

                {fotoUri && locationData && (
                  <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.7, result: 'tmpfile' }}>
                    <View style={styles.photoPreviewContainer}>
                      <Image source={{ uri: fotoUri }} style={styles.photoPreview} />
                      <View style={styles.watermarkOverlay}>
                        <Text style={styles.watermarkText}>{locationData.timestamp}</Text>
                        <Text style={styles.watermarkText}>Lat: {locationData.latitude}</Text>
                        <Text style={styles.watermarkText}>Lon: {locationData.longitude}</Text>
                      </View>
                    </View>
                  </ViewShot>
                )}
              </>
            )}
          </ScrollView>

            <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.submitModalBtn} onPress={submitForm} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitModalBtnText}>{modalMode === 'AGENDAR' ? 'Agendar Labor' : 'Confirmar Ejecución'}</Text>}
            </TouchableOpacity>
            </View>
          </View>
        </View>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.primaryFixedDim,
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.inversePrimary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    paddingBottom: 16,
  },
  monthCard: {
    width: '31.5%',
    height: '23.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  monthCardActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: '#f8fdfa',
    elevation: 12,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    transform: [{ scale: 1.02 }],
  },
  monthWatermark: {
    position: 'absolute',
    fontSize: 58,
    fontWeight: '900',
    color: theme.colors.primary,
    opacity: 0.08,
    transform: [{ translateY: -10 }],
  },
  monthCardContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    width: '100%',
    paddingVertical: 16,
  },
  monthName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  monthNameActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  taskIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 67, 40, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskIndicatorContainerEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  noTaskText: {
    fontSize: 11,
    color: theme.colors.outline,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  floatingModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    minHeight: 300,
  },
  emptyStateText: {
    marginTop: 16,
    color: theme.colors.onSurfaceVariant,
    fontSize: 16,
  },
  emptyAddBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.inversePrimary,
    borderRadius: 20,
  },
  emptyAddBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  laborCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  laborHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  laborName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    flex: 1,
  },
  laborText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  ejecutarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inversePrimary,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  ejecutarBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  modalCloseText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 6,
    marginTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: theme.colors.surface,
    color: theme.colors.onSurface,
  },
  insumoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  insumoItemNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  insumoItemDetalle: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  insumoDeleteBtn: {
    padding: 8,
  },
  insumoAddBtn: {
    backgroundColor: theme.colors.inversePrimary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insumoHint: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 6,
  },
  jornaleroBox: {
    backgroundColor: 'rgba(0, 67, 40, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 67, 40, 0.12)',
    padding: 12,
    marginTop: 8,
  },
  jornaleroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jornaleroTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  jornaleroLink: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.secondary,
    textDecorationLine: 'underline',
  },
  jornaleroResumen: {
    backgroundColor: 'rgba(142, 214, 170, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  jornaleroResumenText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary,
    padding: 14,
    borderRadius: 8,
  },
  cameraBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  photoPreviewContainer: {
    marginTop: 16,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 8,
  },
  watermarkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitModalBtn: {
    backgroundColor: theme.colors.inversePrimary,
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  submitModalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
