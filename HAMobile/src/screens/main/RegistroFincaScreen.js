import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { RepositorioFincas } from '../../data/repositorio/RepositorioFincas';
import * as Location from 'expo-location';
import { FarmMapEditor } from '../../components/map/FarmMapEditor';
import { GeoLookupService } from '../../data/local/GeoLookupService';
import { EUDRService } from '../../services/EUDRService';
import SafeStorage from '../../utils/SafeStorage';
import CryptoJS from 'crypto-js';
import * as Application from 'expo-application';

// ... (Rest of imports)
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
  Maximize2,
  Info
} from 'lucide-react-native';
import * as Crypto from 'expo-crypto';

// Helper for decryption (needs to match AuthContext)
const getEncryptionKey = () => {
  try {
    const hardwareId = Application.getAndroidId() || 'ha_fallback_id_safe';
    return CryptoJS.SHA256(`ha_mobile_v1_${hardwareId}`).toString();
  } catch (e) {
    return 'ha_emergency_key_js_only';
  }
};

const RegistroFincaScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);

  // --- ESTADO DEL FORMULARIO ---
  
  // Paso 1: Información del Productor
  const [nombreProductor, setNombreProductor] = useState(user?.first_name ? `${user.first_name} ${user.last_name}` : '');
  const [cedulaId, setCedulaId] = useState(user?.identifier || '');
  
  // Extraer nombres para la vista densa
  const [firstName, ...lastNameParts] = nombreProductor.split(' ');
  const lastName = lastNameParts.join(' ') || '';

  const [emailProductor, setEmailProductor] = useState(user?.email || '');
  const [organizacion, setOrganizacion] = useState('');
  const [celular, setCelular] = useState(user?.phone_number || '');
  const [genero, setGenero] = useState(user?.genero || '');
  const [edad, setEdad] = useState(user?.edad ? String(user.edad) : '');

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

  // Actualizar datos del productor automáticamente desde el perfil logueado
  useEffect(() => {
    if (user) {
      setNombreProductor(user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Usuario');
      setCedulaId(user.identifier || '');
      setEmailProductor(user.email || '');
      setCelular(user.phone_number || '');
      setGenero(user.genero || '');
      setEdad(user.edad ? String(user.edad) : '');
      if (user.organizacion) setOrganizacion(user.organizacion);
    }
  }, [user]);

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
        showAlert('Permiso denegado', 'Se necesita acceso a la ubicación.', 'warning');
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitud(location.coords.latitude.toString());
      setLongitud(location.coords.longitude.toString());
      if (location.coords.altitude) {
        setAltitud(Math.round(location.coords.altitude).toString());
      }
    } catch (error) {
      showAlert('Error', 'No se pudo obtener la ubicación.', 'error');
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

  const obtenerToken = async () => {
    try {
      const encryptedToken = await SafeStorage.getItem('auth_token_enc');
      if (!encryptedToken) return null;
      const bytes = CryptoJS.AES.decrypt(encryptedToken, getEncryptionKey());
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return null;
    }
  };

  const guardarRegistro = async () => {
    if (!nombreFinca || puntos.length < 3 || !cedulaId || !nombreProductor) {
      showAlert('Error', 'Nombre de finca, datos del productor y polígono (mín 3 puntos) son obligatorios.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const sqlite = db();
      
      // 1. Generar UUIDs locales (v4)
      const productorId = Crypto.randomUUID();
      const fincaId = Crypto.randomUUID();
      const expedienteId = Crypto.randomUUID();
      const datoId = Crypto.randomUUID();

      // 2. Preparar Datos de Productor
      const [firstName, ...lastNameParts] = nombreProductor.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      await sqlite.insert(require('../../data/local/esquema').productores).values({
        id: productorId,
        first_name: firstName,
        last_name: lastName,
        cedula_id: cedulaId,
        email: emailProductor,
        phone_number: celular,
        edad: parseInt(edad) || 0,
        genero,
        organizacion,
        sync_status: 'pending',
        creado_en: new Date()
      });

      // 3. Preparar Geometría
      const coordenadasCerradas = [...puntos];
      if (puntos[0][0] !== puntos[puntos.length - 1][0] || puntos[0][1] !== puntos[puntos.length - 1][1]) {
        coordenadasCerradas.push(puntos[0]);
      }
      const geoJsonStr = JSON.stringify({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coordenadasCerradas] },
        properties: { tipo_captura: 'GPS_Wizard', precision_promedio_metros: 2.4 }
      });

      // 4. Guardar Finca Localmente (pending)
      await sqlite.insert(require('../../data/local/esquema').fincas).values({
        id: fincaId,
        nombre: nombreFinca,
        productorId: productorId, 
        provincia,
        canton,
        parroquia,
        barrioSector: barrio,
        areaTotalHa: parseFloat(areaTotal) || 0,
        areaCultivoHa: parseFloat(areaCultivada) || 0,
        tenenciaTierra: tenencia,
        geometriaGeoJson: geoJsonStr,
        latitudCentro: parseFloat(latitud),
        longitudCentro: parseFloat(longitud),
        syncStatus: 'pending',
        creadoEn: new Date()
      });

      // 5. Guardar Expediente Localmente (pending)
      await sqlite.insert(require('../../data/local/esquema').expedientes).values({
        id: expedienteId,
        fincaId: fincaId,
        productorId: productorId,
        organizacionInquilino: organizacion,
        syncStatus: 'pending',
        creadoEn: new Date()
      });

      // 6. Guardar Datos Agroambientales (pending)
      await sqlite.insert(require('../../data/local/esquema').datosAgroambientales).values({
        id: datoId,
        expedienteId: expedienteId,
        indiceShannon: parseFloat(indiceShannon),
        indiceSimpson: parseFloat(indiceSimpson),
        usoSuelo: usoSuelo,
        coberturaForestal: JSON.stringify(coberturaForestal),
        sistemaProduccion: sistemaProduccion,
        biomasaAereaTcHa: parseFloat(biomasaAerea),
        cosTcHa: parseFloat(carbonoSuelo),
        totalStockCarbono: parseFloat(totalStockCarbono),
        syncStatus: 'pending',
        creadoEn: new Date()
      });

      // 7. Guardar Variables Dinámicas (pending)
      for (const campo of camposDinamicos) {
        if (campo.nombre && campo.valor) {
          await sqlite.insert(require('../../data/local/esquema').variablesDinamicas).values({
            id: Crypto.randomUUID(),
            datoId: datoId,
            nombre: campo.nombre,
            valor: campo.valor,
            tipoDato: 'texto',
            syncStatus: 'pending',
            creadoEn: new Date()
          });
        }
      }

      showAlert('Éxito', 'Registro guardado localmente. Se sincronizará automáticamente al detectar conexión.', 'success', () => navigation.goBack());
      
      // Intentar sincronizar en segundo plano
      const token = await obtenerToken();
      if (token) {
        const { SyncService } = require('../../services/SyncService');
        SyncService.syncAll(token).catch(e => console.warn('Sync fallido:', e));
      }

      setStep(1);
      setPuntos([]);
      setNombreFinca('');
      setCamposDinamicos([]);

    } catch (error) {
      console.error('Error al guardar local:', error);
      showAlert('Error', 'No se pudo guardar el registro en la base de datos local.', 'error');
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
        <User size={20} color="#fff" />
        <Text style={styles.sectionTitle}>Perfil del Productor (Lectura)</Text>
      </View>
      
      <View style={styles.denseForm}>
        <View style={styles.row}>
          <View style={[styles.inputGroupDense, { flex: 1, marginRight: 6 }]}>
            <Text style={styles.labelSmall}>Nombres</Text>
            <TextInput style={[styles.inputDense, styles.inputDisabled]} value={firstName} editable={false} />
          </View>
          <View style={[styles.inputGroupDense, { flex: 1 }]}>
            <Text style={styles.labelSmall}>Apellidos</Text>
            <TextInput style={[styles.inputDense, styles.inputDisabled]} value={lastName} editable={false} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroupDense, { flex: 1.2, marginRight: 6 }]}>
            <Text style={styles.labelSmall}>Cédula</Text>
            <TextInput style={[styles.inputDense, styles.inputDisabled]} value={cedulaId} editable={false} />
          </View>
          <View style={[styles.inputGroupDense, { flex: 1 }]}>
            <Text style={styles.labelSmall}>Edad</Text>
            <TextInput style={[styles.inputDense, styles.inputDisabled]} value={edad} editable={false} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroupDense, { flex: 1, marginRight: 6 }]}>
            <Text style={styles.labelSmall}>Género</Text>
            <TextInput style={[styles.inputDense, styles.inputDisabled]} value={genero} editable={false} />
          </View>
          <View style={[styles.inputGroupDense, { flex: 1.5 }]}>
            <Text style={styles.labelSmall}>Celular</Text>
            <TextInput style={[styles.inputDense, styles.inputDisabled]} value={celular} editable={false} />
          </View>
        </View>

        <View style={styles.inputGroupDense}>
          <Text style={styles.labelSmall}>Correo Electrónico</Text>
          <TextInput style={[styles.inputDense, styles.inputDisabled]} value={emailProductor} editable={false} />
        </View>

        <View style={styles.inputGroupDense}>
          <Text style={styles.labelSmall}>Organización / Cooperativa</Text>
          <TextInput style={[styles.inputDense, styles.inputDisabled]} value={organizacion} editable={false} />
        </View>
      </View>
      <View style={styles.infoBox}>
        <Info size={16} color={theme.colors.primary} />
        <Text style={styles.infoText}>Estos datos provienen de tu perfil y no son editables en este formulario.</Text>
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
        <View style={styles.eudrIdCard}>
          <View style={styles.eudrIdIconContainer}>
            <Layers size={18} color="#fff" />
          </View>
          <View style={styles.eudrIdContent}>
            <Text style={styles.eudrIdCode}>{eudrId || 'CALCULANDO...'}</Text>
            <Text style={styles.eudrIdLabel}>Sincronizado con Google Plus Code</Text>
          </View>
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
  denseForm: { paddingHorizontal: 2 },
  inputGroupDense: { marginBottom: 12 },
  labelSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4, fontWeight: '600' },
  inputDense: { backgroundColor: '#fff', borderRadius: 8, height: 42, paddingHorizontal: 12, color: '#000', fontSize: 15 },
  inputDisabled: { backgroundColor: '#eee', color: '#666' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryFixed,
    padding: 12,
    borderRadius: 12,
    marginTop: 15,
  },
  infoText: {
    ...theme.typography.labelSm,
    color: theme.colors.onPrimaryFixed,
    marginLeft: 8,
    flex: 1,
  },
  inputGroup: { marginBottom: 15 },
  label: { ...theme.typography.labelSm, color: '#fff', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#fff', borderRadius: 10, height: 50, paddingHorizontal: 15, color: '#000', fontSize: 16 },
  disabledInput: { backgroundColor: '#e0e0e0', justifyContent: 'center' },
  eudrIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  eudrIdIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eudrIdContent: {
    flex: 1,
  },
  eudrIdCode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  eudrIdLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
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
