import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';
import { RepositorioFincas } from '../../data/repositorio/RepositorioFincas';
import * as Location from 'expo-location';
import { FarmMapEditor } from '../../components/map/FarmMapEditor';
import { GeoLookupService } from '../../data/local/GeoLookupService';
import { 
  Map as MapIcon, 
  User, 
  Home, 
  MapPin, 
  Save, 
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Layers,
  Trees,
  PlusCircle,
  XCircle,
  Maximize2
} from 'lucide-react-native';
import * as Crypto from 'expo-crypto';

const RegistroFincaScreen = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);

  // --- ESTADO DEL FORMULARIO ---
  
  // Paso 1: Información del Productor
  const [nombreProductor, setNombreProductor] = useState(user?.name || '');
  const [organizacion, setOrganizacion] = useState('');
  const [celular, setCelular] = useState('');
  const [genero, setGenero] = useState('');
  const [edad, setEdad] = useState('');

  // Paso 2: Información de la Finca
  const [nombreFinca, setNombreFinca] = useState('');
  const [eudrId, setEudrId] = useState('');
  const [provincia, setProvincia] = useState('Loja');
  const [canton, setCanton] = useState('');
  const [parroquia, setParroquia] = useState('');
  const [barrio, setBarrio] = useState('');
  const [areaTotal, setAreaTotal] = useState('');
  const [areaCultivada, setAreaCultivada] = useState('');
  const [tenencia, setTenencia] = useState('Propia con escritura');
  
  // Geolocation
  const [latitud, setLatitud] = useState('-3.99313');
  const [longitud, setLongitud] = useState('-79.20422');
  const [altitud, setAltitud] = useState('2100');
  const [puntos, setPuntos] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [locating, setLocating] = useState(false);

  // Paso 3: Agroambiental & Dinámicos
  const [indiceShannon, setIndiceShannon] = useState('2.56');
  const [indiceSimpson, setIndiceSimpson] = useState('0.84');
  const [usoSuelo, setUsoSuelo] = useState('Sistema Agroforestal de Café');
  const [coberturaForestal, setCoberturaForestal] = useState(['Laurel', 'Aguacate']);
  const [sistemaProduccion, setSistemaProduccion] = useState('');
  const [biomasaAerea, setBiomasaAerea] = useState('45.2');
  const [carbonoSuelo, setCarbonoSuelo] = useState('68.8');
  const [totalStockCarbono, setTotalStockCarbono] = useState('114.0');
  
  const [camposDinamicos, setCamposDinamicos] = useState([]);

  // Repositorio
  const repo = useMemo(() => new RepositorioFincas(user?.tenantId || 'default-tenant'), [user]);

  // Lógica para generar Plus Code simple basado en coordenadas
  useEffect(() => {
    if (latitud && longitud) {
      const mockPlusCode = `${Math.abs(Math.round(parseFloat(latitud) * 100))}${Math.abs(Math.round(parseFloat(longitud) * 100))}+M3J ${provincia}`;
      setEudrId(mockPlusCode);
    }
  }, [latitud, longitud, provincia]);

  // Autocompletado de ubicación política basado en el polígono
  useEffect(() => {
    let data = null;
    if (puntos.length >= 3) {
      data = GeoLookupService.lookupPolygonLocation(puntos);
    } else if (latitud && longitud) {
      data = GeoLookupService.lookupLocation(parseFloat(longitud), parseFloat(latitud));
    }

    if (data) {
      if (data.provincia) setProvincia(data.provincia);
      if (data.canton) setCanton(data.canton);
      // Solo aplicar parroquia si es Loja, de lo contrario limpiar
      if (data.provincia && data.provincia.toUpperCase() === 'LOJA') {
        setParroquia(data.parroquia || '');
      } else {
        setParroquia('');
      }
    }
  }, [puntos, latitud, longitud]);

  const obtenerUbicacionActual = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitud(location.coords.latitude.toString());
      setLongitud(location.coords.longitude.toString());
      if (location.coords.altitude) {
        setAltitud(Math.round(location.coords.altitude).toString());
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    } finally {
      setLocating(false);
    }
  };

  const agregarPunto = React.useCallback((e) => {
    if (!isDrawing) return;
    const { geometry } = e;
    setPuntos(prev => [...prev, geometry.coordinates]);
  }, [isDrawing]);

  const limpiarMapa = () => {
    setPuntos([]);
    setIsDrawing(false);
  };

  const deshacerPunto = () => {
    if (puntos.length > 0) {
      setPuntos(prev => prev.slice(0, -1));
    }
  };

  const agregarCampoDinamico = () => {
    setCamposDinamicos([...camposDinamicos, { id: Date.now(), nombre: '', valor: '' }]);
  };

  const actualizarCampoDinamico = (id, field, value) => {
    setCamposDinamicos(camposDinamicos.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const eliminarCampoDinamico = (id) => {
    setCamposDinamicos(camposDinamicos.filter(c => c.id !== id));
  };

  const guardarRegistro = async () => {
    if (!nombreFinca || puntos.length < 3) {
      Alert.alert('Error', 'Nombre de finca y polígono (mín 3 puntos) son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const idFinca = Crypto.randomUUID();
      const coordenadasCerradas = [...puntos];
      if (puntos[0][0] !== puntos[puntos.length - 1][0] || puntos[0][1] !== puntos[puntos.length - 1][1]) {
        coordenadasCerradas.push(puntos[0]);
      }

      const geoJson = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coordenadasCerradas] },
        properties: { tipo_captura: 'GPS_Wizard', precision_promedio_metros: 2.4 }
      };

      const customData = {
        productor: {
          organizacion,
          celular,
          genero,
          edad: parseInt(edad) || 0
        },
        geografia: {
          provincia,
          canton,
          parroquia,
          barrio,
          eudr_id: eudrId
        },
        agroambiental: {
          indice_shannon: parseFloat(indiceShannon),
          indice_simpson: parseFloat(indiceSimpson),
          uso_suelo: usoSuelo,
          cobertura_forestal: coberturaForestal,
          sistema_produccion: sistemaProduccion,
          biomasa_aerea_tc_ha: parseFloat(biomasaAerea),
          cos_tc_ha: parseFloat(carbonoSuelo),
          total_stock_carbono_tc_ha: parseFloat(totalStockCarbono)
        },
        campos_adicionales: camposDinamicos.reduce((acc, curr) => {
          if (curr.nombre) acc[curr.nombre] = curr.valor;
          return acc;
        }, {})
      };

      const datosFinca = {
        id: idFinca,
        nombre: nombreFinca,
        productorId: user?.id || 'anon',
        geometriaGeoJson: geoJson,
        areaGeodesicaHectareas: parseFloat(areaTotal) || 0,
        tipoCaptura: 'GPS_WALK',
        gpsAccuracyMeters: 2.4,
        coordenadasCentrales: {
          latitud: parseFloat(latitud),
          longitud: parseFloat(longitud),
          altitud: parseFloat(altitud)
        },
        datosPersonalizados: customData
      };

      const vertices = puntos.map(p => ({
        latitud: p[1],
        longitud: p[0],
        precisionMetros: 2.4
      }));

      await repo.crearConVertices(datosFinca, vertices);
      Alert.alert('Éxito', 'Registro completado correctamente.');
      setStep(1);
      setPuntos([]);
      setNombreFinca('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el registro.');
    } finally {
      setLoading(false);
    }
  };

  // --- COMPONENTES DE PASOS ---

  const ProgressBar = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepIndicatorWrapper}>
          <TouchableOpacity 
            style={[styles.stepCircle, step >= s && styles.stepCircleActive]}
            onPress={() => setStep(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
          </TouchableOpacity>
          {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const Step1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.sectionHeader}>
        <User size={22} color="#fff" />
        <Text style={styles.sectionTitle}>Información del Productor</Text>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nombre Completo</Text>
        <TextInput style={styles.input} value={nombreProductor} onChangeText={setNombreProductor} placeholder="Nombre del productor" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Organización / Asociación</Text>
        <TextInput style={styles.input} value={organizacion} onChangeText={setOrganizacion} placeholder="Nombre de la cooperativa" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Celular de Contacto</Text>
        <TextInput style={styles.input} value={celular} onChangeText={setCelular} keyboardType="phone-pad" placeholder="099XXXXXXX" />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Género</Text>
          <TextInput style={styles.input} value={genero} onChangeText={setGenero} placeholder="M / F / Otro" />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Edad</Text>
          <TextInput style={styles.input} value={edad} onChangeText={setEdad} keyboardType="numeric" placeholder="Años" />
        </View>
      </View>
    </View>
  );

  const Step2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.sectionHeader}>
        <Home size={22} color="#fff" />
        <Text style={styles.sectionTitle}>Información de la Finca</Text>
      </View>

      <TouchableOpacity style={styles.miniMapCard} onPress={() => setShowFullMap(true)}>
        <View style={styles.miniMapHeader}>
          <MapIcon size={18} color="#fff" />
          <Text style={styles.miniMapTitle}>Georreferenciación (Polígono)</Text>
          <Maximize2 size={18} color="#fff" style={{ marginLeft: 'auto' }} />
        </View>
        <View style={styles.miniMapWrapper}>
          <FarmMapEditor 
            fullScreen={false}
            latitud={latitud} 
            longitud={longitud} 
            puntos={puntos} 
          />
        </View>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.locationButton} onPress={obtenerUbicacionActual}>
          {locating ? <ActivityIndicator color="#fff" /> : <><LocateFixed size={20} color="#fff" /><Text style={styles.locationButtonText}>GPS Centro</Text></>}
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <TextInput style={[styles.input, { height: 45, fontSize: 12 }]} value={`${latitud}, ${longitud}`} editable={false} />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nombre de la Finca</Text>
        <TextInput style={styles.input} value={nombreFinca} onChangeText={setNombreFinca} placeholder="Ej. La Esperanza" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Código Único (EUDR ID)</Text>
        <View style={[styles.input, styles.disabledInput]}>
          <Text style={{ color: '#555' }}>{eudrId || 'Calculando...'}</Text>
        </View>
      </View>

      <Text style={[styles.label, { marginBottom: 10, marginTop: 5, fontSize: 14, textDecorationLine: 'underline' }]}>Ubicación Política</Text>
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Provincia</Text>
          <TextInput style={styles.input} value={provincia} onChangeText={setProvincia} placeholder="Ej. Loja" />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Cantón</Text>
          <TextInput style={styles.input} value={canton} onChangeText={setCanton} placeholder="Ej. Loja" />
        </View>
      </View>
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Parroquia</Text>
          <TextInput 
            style={[styles.input, (provincia.toUpperCase() !== 'LOJA') && styles.disabledInput]} 
            value={parroquia} 
            onChangeText={setParroquia} 
            placeholder={provincia.toUpperCase() === 'LOJA' ? "Ej. El Sagrario" : "Solo en Loja"} 
            editable={provincia.toUpperCase() === 'LOJA'}
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Barrio / Sector</Text>
          <TextInput style={styles.input} value={barrio} onChangeText={setBarrio} placeholder="Ej. Malacatos" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Área Total (Ha)</Text>
          <TextInput style={styles.input} value={areaTotal} onChangeText={setAreaTotal} keyboardType="numeric" />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Área Cultivo (Ha)</Text>
          <TextInput style={styles.input} value={areaCultivada} onChangeText={setAreaCultivada} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tenencia de Tierra</Text>
        <TextInput style={styles.input} value={tenencia} onChangeText={setTenencia} placeholder="Propia, Arrendada, etc." />
      </View>
    </View>
  );

  const Step3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.sectionHeader}>
        <Trees size={22} color="#fff" />
        <Text style={styles.sectionTitle}>Información Agroambiental</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Ind. Shannon</Text>
          <TextInput style={styles.input} value={indiceShannon} onChangeText={setIndiceShannon} keyboardType="numeric" />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Ind. Simpson</Text>
          <TextInput style={styles.input} value={indiceSimpson} onChangeText={setIndiceSimpson} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Uso de Suelo</Text>
        <TextInput style={styles.input} value={usoSuelo} onChangeText={setUsoSuelo} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Cobertura Forestal (Tags)</Text>
        <TextInput style={styles.input} value={coberturaForestal.join(', ')} editable={false} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Sistema de Producción</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} 
          value={sistemaProduccion} 
          onChangeText={setSistemaProduccion} 
          multiline 
          placeholder="Descripción detallada..."
        />
      </View>

      <View style={styles.sectionHeader}>
        <Layers size={22} color="#fff" />
        <Text style={styles.sectionTitle}>Stocks de Carbono</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Biomasa Aérea</Text>
          <TextInput style={styles.input} value={biomasaAerea} onChangeText={setBiomasaAerea} keyboardType="numeric" />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>COS (tC/ha)</Text>
          <TextInput style={styles.input} value={carbonoSuelo} onChangeText={setCarbonoSuelo} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Total Carbono Stock (tC/ha)</Text>
        <TextInput style={styles.input} value={totalStockCarbono} onChangeText={setTotalStockCarbono} keyboardType="numeric" />
      </View>

      <View style={styles.sectionHeader}>
        <PlusCircle size={22} color="#fff" />
        <Text style={styles.sectionTitle}>Campos Personalizados</Text>
      </View>

      {camposDinamicos.map((campo) => (
        <View key={campo.id} style={styles.dynamicFieldRow}>
          <TextInput 
            style={[styles.input, { flex: 1, marginRight: 5, height: 40 }]} 
            placeholder="Nombre" 
            value={campo.nombre}
            onChangeText={(v) => actualizarCampoDinamico(campo.id, 'nombre', v)}
          />
          <TextInput 
            style={[styles.input, { flex: 1, marginRight: 5, height: 40 }]} 
            placeholder="Valor" 
            value={campo.valor}
            onChangeText={(v) => actualizarCampoDinamico(campo.id, 'valor', v)}
          />
          <TouchableOpacity onPress={() => eliminarCampoDinamico(campo.id)}>
            <XCircle size={24} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addFieldButton} onPress={agregarCampoDinamico}>
        <PlusCircle size={18} color={theme.colors.primary} />
        <Text style={styles.addFieldText}>Añadir Campo</Text>
      </TouchableOpacity>
    </View>
  );

  if (showFullMap) {
    return (
      <FarmMapEditor 
        fullScreen={true}
        latitud={latitud}
        longitud={longitud}
        puntos={puntos}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        agregarPunto={agregarPunto}
        limpiarMapa={limpiarMapa}
        deshacerPunto={deshacerPunto}
        onClose={() => setShowFullMap(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>Registro de Finca</Text>
          <ProgressBar />
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 ? (
            <TouchableOpacity style={styles.navButtonSecondary} onPress={() => setStep(step - 1)}>
              <ChevronLeft size={20} color="#fff" />
              <Text style={styles.navButtonText}>Anterior</Text>
            </TouchableOpacity>
          ) : <View style={{ flex: 1 }} />}

          {step < 3 ? (
            <TouchableOpacity style={styles.navButtonPrimary} onPress={() => setStep(step + 1)}>
              <Text style={styles.navButtonText}>Siguiente</Text>
              <ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={guardarRegistro} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <><Save size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.submitButtonText}>Finalizar</Text></>}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.primary },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  mainTitle: { ...theme.typography.headlineLgMobile, color: '#fff', fontSize: 24, marginBottom: 10 },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  stepIndicatorWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  stepCircleActive: { backgroundColor: theme.colors.secondary, borderColor: '#fff' },
  stepNumber: { color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' },
  stepNumberActive: { color: '#fff' },
  stepLine: { width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepLineActive: { backgroundColor: theme.colors.secondary },
  formScroll: { flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  formContent: { paddingHorizontal: 20, paddingBottom: 100 },
  stepContent: { paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 8 },
  sectionTitle: { ...theme.typography.labelMd, fontSize: 18, color: '#fff', marginLeft: 10, fontWeight: 'bold' },
  inputGroup: { marginBottom: 15 },
  label: { ...theme.typography.labelSm, color: '#fff', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 10, height: 50, paddingHorizontal: 15, color: '#000', fontSize: 16 },
  disabledInput: { backgroundColor: '#e0e0e0', justifyContent: 'center' },
  row: { flexDirection: 'row', marginBottom: 10 },
  locationButton: { backgroundColor: theme.colors.secondary, borderRadius: 10, height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  locationButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
  miniMapCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 15, padding: 10, marginVertical: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  miniMapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  miniMapTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  miniMapWrapper: { height: 150, borderRadius: 10, overflow: 'hidden' },
  footer: { flexDirection: 'row', padding: 12, backgroundColor: theme.colors.primary, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'space-between' },
  navButtonPrimary: { flex: 1, backgroundColor: theme.colors.secondary, height: 46, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  navButtonSecondary: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', height: 46, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  navButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginHorizontal: 6 },
  submitButton: { flex: 1, backgroundColor: '#4CAF50', height: 46, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase' },
  dynamicFieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  addFieldButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 5 },
  addFieldText: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 5 },
});

export default RegistroFincaScreen;
