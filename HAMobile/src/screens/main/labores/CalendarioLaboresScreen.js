import React, { useState, useEffect, useRef } from 'react';
import { Picker } from '@react-native-picker/picker';
import actividadesData from '../../../data/actividades.json';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView, Modal, TextInput, Alert, Image } from 'react-native';
import { theme } from '../../../theme/theme';
import { ChevronLeft, Plus, Calendar, CheckCircle2, Clock, PlayCircle, Camera as CameraIcon } from 'lucide-react-native';
import SafeStorage from '../../../utils/SafeStorage';
import CryptoJS from 'crypto-js';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import ViewShot from 'react-native-view-shot';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CalendarioLaboresScreen({ route, navigation }) {
  const { finca } = route.params;
  const [labores, setLabores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMes, setSelectedMes] = useState(MESES[new Date().getMonth()]);
  
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

  // Form State - Ejecutar
  const [personaDesarrollo, setPersonaDesarrollo] = useState('');
  const [nombreJornalero, setNombreJornalero] = useState('');
  const [detalleAplicacion, setDetalleAplicacion] = useState('');
  const [salario, setSalario] = useState('');
  const [herramientas, setHerramientas] = useState('');
  const [insumoNombre, setInsumoNombre] = useState('');
  const [insumoCantidad, setInsumoCantidad] = useState('');
  const [insumoUnidad, setInsumoUnidad] = useState('');
  const [fotoUri, setFotoUri] = useState(null);
  const [locationData, setLocationData] = useState(null);

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
    fetchLabores();
  }, []);

  const fetchLabores = async () => {
    setLoading(true);
    try {
      const token = await obtenerToken();
      if (!token) return;
      const res = await fetch(`${process.env.EXPO_PUBLIC_EXPED_API_URL}/labores/calendario/${finca.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        // Assume json is array of labores
        setLabores(Array.isArray(json) ? json : json.data || []);
      }
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
    setPersonaDesarrollo('');
    setNombreJornalero('');
    setDetalleAplicacion('');
    setSalario('');
    setHerramientas('');
    setInsumoNombre('');
    setInsumoCantidad('');
    setInsumoUnidad('');
    setFotoUri(null);
    setLocationData(null);
  };

  const openAgendar = () => {
    resetForm();
    setModalMode('AGENDAR');
    setModalVisible(true);
  };

  const openEjecutar = (labor) => {
    resetForm();
    setSelectedLabor(labor);
    setModalMode('EJECUTAR');
    setModalVisible(true);
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
      const token = await obtenerToken();
      if (!token) return;

      if (modalMode === 'AGENDAR') {
        if (!nombreForm || !tipoProcesoForm || !cantidadProyectadaForm) {
          Alert.alert('Error', 'Llene los campos obligatorios.');
          setIsSubmitting(false);
          return;
        }

        const payload = {
          nombre: nombreForm,
          tipo_proceso: tipoProcesoForm,
          mes: mesForm,
          cantidad_proyectada: cantidadProyectadaForm,
          finca_id: finca.id
        };

        const res = await fetch(`${process.env.EXPO_PUBLIC_EXPED_API_URL}/labores/agendar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          Alert.alert('Éxito', 'Labor agendada correctamente.');
          setModalVisible(false);
          setSelectedMes(mesForm);
          fetchLabores();
        } else {
          Alert.alert('Error', 'No se pudo agendar la labor.');
        }

      } else {
        // EJECUTAR
        if (!fotoUri || !locationData || !viewShotRef.current) {
          Alert.alert('Error', 'Debe capturar la imagen con ubicación para ejecutar la labor.');
          setIsSubmitting(false);
          return;
        }

        // Capture watermarked image
        const watermarkedBase64 = await viewShotRef.current.capture();

        // Upload to Cloudinary
        const timestamp = Math.round(new Date().getTime() / 1000);
        const stringToSign = `timestamp=${timestamp}${process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET}`;
        const signature = CryptoJS.SHA1(stringToSign).toString();

        const formData = new FormData();
        formData.append('file', `data:image/jpeg;base64,${watermarkedBase64}`);
        formData.append('api_key', process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData
        });

        if (!cloudinaryRes.ok) {
          Alert.alert('Error', 'No se pudo subir la imagen a Cloudinary.');
          setIsSubmitting(false);
          return;
        }

        const cloudinaryData = await cloudinaryRes.json();
        const uploadedFotoUrl = cloudinaryData.secure_url;

        const payload = {
          persona_desarrollo: personaDesarrollo || 'TITULAR',
          nombre_jornalero: nombreJornalero,
          detalle_aplicacion: detalleAplicacion,
          salario: parseFloat(salario) || 0,
          insumos: insumoNombre ? [{ nombre: insumoNombre, cantidad: parseFloat(insumoCantidad)||0, unidad: insumoUnidad||'unidad' }] : [],
          herramientas: herramientas.split(',').map(s=>s.trim()).filter(Boolean),
          foto_url: uploadedFotoUrl,
          foto_hash: cloudinaryData.public_id || 'generated_hash',
          latitud: locationData.latitude,
          longitud: locationData.longitude,
          watermark_text: `Fecha: ${locationData.timestamp} | Lat: ${locationData.latitude} | Lon: ${locationData.longitude}`
        };

        const res = await fetch(`${process.env.EXPO_PUBLIC_EXPED_API_URL}/labores/${selectedLabor.id}/ejecutar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          Alert.alert('Éxito', 'Labor ejecutada correctamente.');
          setModalVisible(false);
          fetchLabores();
        } else {
          Alert.alert('Error', 'No se pudo ejecutar la labor.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Error de red.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const laboresDelMes = labores.filter(l => l.mes?.toLowerCase() === selectedMes.toLowerCase());
  
  // Agrupar por estado
  const planificados = laboresDelMes.filter(l => !l.estado || l.estado === 'PLANIFICADO');
  const enEjecucion = laboresDelMes.filter(l => l.estado === 'EN_EJECUCION');
  const terminados = laboresDelMes.filter(l => l.estado === 'TERMINADO');

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
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <ChevronLeft size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{finca.nombre}</Text>
          <Text style={styles.subtitle}>Calendario de Labores</Text>
        </View>
        <TouchableOpacity onPress={openAgendar} style={styles.addButton}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.monthsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {MESES.map(mes => (
            <TouchableOpacity
              key={mes}
              onPress={() => setSelectedMes(mes)}
              style={[styles.mesChip, selectedMes === mes && styles.mesChipActive]}
            >
              <Text style={[styles.mesChipText, selectedMes === mes && styles.mesChipTextActive]}>{mes}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : laboresDelMes.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No hay labores agendadas para {selectedMes}</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAgendar}>
              <Text style={styles.emptyAddBtnText}>Agendar Labor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {planificados.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Planificado</Text>
                {planificados.map(l => renderLaborCard(l, '#f59e0b', <Clock size={18} color="#f59e0b" />))}
              </View>
            )}
            
            {enEjecucion.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>En Ejecución</Text>
                {enEjecucion.map(l => renderLaborCard(l, '#3b82f6', <PlayCircle size={18} color="#3b82f6" />))}
              </View>
            )}

            {terminados.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Terminado</Text>
                {terminados.map(l => renderLaborCard(l, '#10b981', <CheckCircle2 size={18} color="#10b981" />))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal para Agendar o Ejecutar */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalMode === 'AGENDAR' ? `Agendar Labor (${selectedMes})` : 'Ejecutar Labor'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {modalMode === 'AGENDAR' ? (
              <>
                <Text style={styles.inputLabel}>Mes programado *</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={mesForm} onValueChange={(val) => { setMesForm(val); }}>
                    {MESES.map(m => <Picker.Item key={m} label={m} value={m} />)}
                  </Picker>
                </View>

                <Text style={styles.inputLabel}>Actividad *</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={nombreForm} onValueChange={(val) => {
                    setNombreForm(val);
                    const act = actividadesData.find(a => a.actividad === val);
                    if (act) {
                      setTipoProcesoForm(act.etapa);
                      setCantidadProyectadaForm(act.cantidad_ha ? `${act.cantidad_ha} ${act.unidad}` : '');
                    }
                  }}>
                    <Picker.Item label="Seleccione una actividad..." value="" />
                    {actividadesData.filter(a => a.mes.toLowerCase() === mesForm.toLowerCase()).map((a, i) => (
                      <Picker.Item key={i} label={a.actividad} value={a.actividad} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.inputLabel}>Etapa *</Text>
                <TextInput style={styles.input} value={tipoProcesoForm} onChangeText={setTipoProcesoForm} placeholder="Ej. Producción" />

                <Text style={styles.inputLabel}>Cantidad Proyectada *</Text>
                <TextInput style={styles.input} value={cantidadProyectadaForm} onChangeText={setCantidadProyectadaForm} placeholder="Ej. 2 hectáreas" />
              </>
            ) : (
              <>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>Labor: {selectedLabor?.nombre}</Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Mes programado: {selectedLabor?.mes} (Visual)</Text>

                <Text style={styles.inputLabel}>Persona que desarrolla (Roles)</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={personaDesarrollo} onValueChange={setPersonaDesarrollo}>
                    <Picker.Item label="TITULAR" value="TITULAR" />
                    <Picker.Item label="JORNALERO" value="JORNALERO" />
                    <Picker.Item label="TECNICO CAMPO" value="TECNICO_CAMPO" />
                    <Picker.Item label="TERCERO" value="TERCERO" />
                  </Picker>
                </View>

                <Text style={styles.inputLabel}>Nombre Jornalero (si aplica)</Text>
                <TextInput style={styles.input} value={nombreJornalero} onChangeText={setNombreJornalero} placeholder="Ej. Juan Pérez" />

                <Text style={styles.inputLabel}>Detalle de aplicación</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} multiline value={detalleAplicacion} onChangeText={setDetalleAplicacion} placeholder="Detalles..." />

                <Text style={styles.inputLabel}>Salario (opcional)</Text>
                <TextInput style={styles.input} value={salario} onChangeText={setSalario} keyboardType="numeric" placeholder="Ej. 15.00" />

                <Text style={styles.inputLabel}>Herramientas (separadas por coma)</Text>
                <TextInput style={styles.input} value={herramientas} onChangeText={setHerramientas} placeholder="Ej. Machete, Tijeras" />

                <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>Insumos (Opcional)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.input, { flex: 2 }]} value={insumoNombre} onChangeText={setInsumoNombre} placeholder="Nombre" />
                  <TextInput style={[styles.input, { flex: 1 }]} value={insumoCantidad} onChangeText={setInsumoCantidad} keyboardType="numeric" placeholder="Cant." />
                  <TextInput style={[styles.input, { flex: 1 }]} value={insumoUnidad} onChangeText={setInsumoUnidad} placeholder="Unid." />
                </View>

                <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 24, marginBottom: 8 }}>Evidencia Fotográfica *</Text>
                <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
                  <CameraIcon size={24} color="#fff" />
                  <Text style={styles.cameraBtnText}>{fotoUri ? 'Cambiar Foto' : 'Tomar Foto con Ubicación'}</Text>
                </TouchableOpacity>

                {fotoUri && locationData && (
                  <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.7, result: 'base64' }}>
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mesChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f3f4',
    marginRight: 8,
  },
  mesChipActive: {
    backgroundColor: theme.colors.primary,
  },
  mesChipText: {
    color: '#5f6368',
    fontWeight: '600',
  },
  mesChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  emptyAddBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
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
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
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
    backgroundColor: theme.colors.primary,
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
