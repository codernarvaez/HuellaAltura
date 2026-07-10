import { useState, useEffect, useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/contexts/AlertContext';
import * as Location from 'expo-location';
import { GeoLookupService } from '@/data/local/GeoLookupService';
import SafeStorage from '@/utils/SafeStorage';
import CryptoJS from 'crypto-js';
import * as Application from 'expo-application';
import { db } from '@/data/local/database';
import * as Crypto from 'expo-crypto';
import { endpoints } from '@/api/endpoints';


const getEncryptionKey = () => {
  try {
    const hardwareId = Application.getAndroidId() || 'ha_fallback_id_safe';
    return CryptoJS.SHA256(`ha_mobile_v1_${hardwareId}`).toString();
  } catch (e) {
    return 'ha_emergency_key_js_only';
  }
};

export const useRegistroFinca = (navigation) => {
  const { user, updateUserProfile } = useAuth();
  const { showAlert } = useAlert();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);

  // Efecto: Interceptar botón físico de atrás en Android cuando el mapa completo está abierto
  useEffect(() => {
    const onBackPress = () => {
      if (showFullMap) {
        setShowFullMap(false);
        return true; // Indicamos que hemos manejado el evento
      }
      return false; // Que el sistema siga su comportamiento normal
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showFullMap]);

  // --- ESTADO DEL FORMULARIO ---
  
  // Paso 1: Información del Productor
  const [nombreProductor, setNombreProductor] = useState('');
  const [cedulaId, setCedulaId] = useState('');
  const [emailProductor, setEmailProductor] = useState('');
  const [organizacion, setOrganizacion] = useState('');
  const [celular, setCelular] = useState('');
  const [genero, setGenero] = useState('');
  const [edad, setEdad] = useState('');
  const [nivelEducativo, setNivelEducativo] = useState('');

  // Paso 2: Información de la Finca
  const [nombreFinca, setNombreFinca] = useState('');
  const [eudrId, setEudrId] = useState('');
  const [provincia, setProvincia] = useState('Loja');
  const [canton, setCanton] = useState('');
  const [parroquia, setParroquia] = useState('');
  const [barrio, setBarrio] = useState('');
  const [areaTotal, setAreaTotal] = useState('');
  const [areaCultivada, setAreaCultivada] = useState('');
  const [tenencia, setTenencia] = useState('PROPIA');
  
  // Geolocation
  const [latitud, setLatitud] = useState('-3.99313');
  const [longitud, setLongitud] = useState('-79.20422');
  const [altitud, setAltitud] = useState('2100');
  const [puntos, setPuntos] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [locating, setLocating] = useState(false);

  // Paso 3: Agroambiental
  const [indiceShannon, setIndiceShannon] = useState('2.56');
  const [indiceSimpson, setIndiceSimpson] = useState('0.84');
  const [usoSuelo, setUsoSuelo] = useState('Sistema Agroforestal de Café');
  const [coberturaForestal, setCoberturaForestal] = useState(['Laurel', 'Aguacate']);
  const [sistemaProduccion, setSistemaProduccion] = useState('Sostenible');
  const [biomasaArboles, setBiomasaArboles] = useState('32.5');
  const [biomasaCafe, setBiomasaCafe] = useState('12.7');
  const [hojarascaMantillo, setHojarascaMantillo] = useState('5.4');
  const [carbonoSuelo, setCarbonoSuelo] = useState('68.8');
  const [totalStockCarbono, setTotalStockCarbono] = useState('119.4');
  const [camposDinamicos, setCamposDinamicos] = useState([]);

  // --- EFECTOS Y LÓGICA ---

  const obtenerToken = async () => {
    try {
      const encryptedToken = await SafeStorage.getItem('auth_token_enc');
      if (!encryptedToken) return null;
      const key = getEncryptionKey();
      const CRYPTO_CONFIG = {
        iv: CryptoJS.enc.Hex.parse('101112131415161718191a1b1c1d1e1f'),
        salt: CryptoJS.enc.Hex.parse('0001020304050607')
      };
      const bytes = CryptoJS.AES.decrypt(encryptedToken, key, CRYPTO_CONFIG);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return null;
    }
  };

  // Efecto 1: Actualizar campos si el usuario en el contexto cambia
  useEffect(() => {
    if (user) {
      setNombreProductor(user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Usuario');
      setCedulaId(user.identifier || '');
      setEmailProductor(user.email || '');
      setCelular(user.phone_number || '');
      setGenero(user.genero || '');
      setEdad(user.edad ? String(user.edad) : '');
      setNivelEducativo(user.nivel_educativo || '');
      if (user.organizacion) setOrganizacion(user.organizacion);
    }
  }, [user]);

  // Efecto 2: Obtener datos frescos desde la API solo al montar la pantalla (evita loop infinito)
  useEffect(() => {
    let mounted = true;

    const fetchLatestProfile = async () => {
      try {
        const tokenStr = await obtenerToken();
        if (!tokenStr) return;
        const response = await fetch(endpoints.auth.me, {
          headers: { 'Authorization': `Bearer ${tokenStr}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (mounted && data) {
            setNombreProductor(data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : 'Usuario');
            setCedulaId(data.identifier || '');
            setEmailProductor(data.email || '');
            setCelular(data.phone_number || '');
            setGenero(data.genero || '');
            setEdad(data.edad ? String(data.edad) : '');
            setNivelEducativo(data.nivel_educativo || '');
            if (data.organizacion) setOrganizacion(data.organizacion);
            
            // --- OFFLINE SUPPORT: Persist latest data ---
            if (updateUserProfile) {
              await updateUserProfile(data);
            }
          }
        }
      } catch (error) {
        console.warn('[RegistroFincaScreen] Error al obtener /auth/me:', error);
      }
    };

    fetchLatestProfile();
    return () => { mounted = false; };
  }, []); // <--- Array vacío para que solo se ejecute una vez al montar

  useEffect(() => {
    if (latitud && longitud) {
      const mockPlusCode = `${Math.abs(Math.round(parseFloat(latitud) * 100))}${Math.abs(Math.round(parseFloat(longitud) * 100))}+M3J ${provincia}`;
      setEudrId(mockPlusCode);
    }
  }, [latitud, longitud, provincia]);

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

  const agregarPunto = useCallback((e) => {
    if (!isDrawing) return;
    const { geometry } = e;
    setPuntos(prev => [...prev, geometry.coordinates]);
  }, [isDrawing]);

  const limpiarMapa = () => { setPuntos([]); setIsDrawing(false); };
  const deshacerPunto = () => { if (puntos.length > 0) setPuntos(prev => prev.slice(0, -1)); };

  const agregarCampoDinamico = () => setCamposDinamicos([...camposDinamicos, { id: Date.now(), nombre: '', valor: '' }]);
  const actualizarCampoDinamico = (id, field, value) => setCamposDinamicos(camposDinamicos.map(c => c.id === id ? { ...c, [field]: value } : c));
  const eliminarCampoDinamico = (id) => setCamposDinamicos(camposDinamicos.filter(c => c.id !== id));

  const guardarRegistro = async () => {
    if (!nombreFinca || puntos.length < 3 || !cedulaId || !nombreProductor) {
      showAlert('Error', 'Nombre de finca, datos del productor y polígono (mín 3 puntos) son obligatorios.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const sqlite = db();
      const fincaId = Crypto.randomUUID();
      const expedienteId = Crypto.randomUUID();
      const datoId = Crypto.randomUUID();
      const productorId = user.id;

      const coordenadasCerradas = [...puntos];
      if (puntos[0][0] !== puntos[puntos.length - 1][0] || puntos[0][1] !== puntos[puntos.length - 1][1]) {
        coordenadasCerradas.push(puntos[0]);
      }
      const geoJsonPoligono = { type: 'Polygon', coordinates: [coordenadasCerradas] };

      await sqlite.insert(require('@/data/local/esquema').fincas).values({
        id: fincaId, nombre: nombreFinca, productor_id: productorId, provincia, canton, parroquia, barrio_sector: barrio,
        area_total_ha: parseFloat(areaTotal) || 0, area_cultivada_ha: parseFloat(areaCultivada) || 0,
        tenencia: (tenencia || 'PROPIA').toUpperCase(), geometria_geojson: JSON.stringify(geoJsonPoligono),
        latitud_centro: parseFloat(latitud), longitud_centro: parseFloat(longitud), sync_status: 'pending', creado_en: new Date()
      });

      await sqlite.insert(require('@/data/local/esquema').datosAgroambientales).values({
        id: datoId, finca_id: fincaId, indice_shannon: parseFloat(indiceShannon) || 0, indice_simpson: parseFloat(indiceSimpson) || 0,
        uso_suelo: usoSuelo, cobertura_forestal: JSON.stringify(coberturaForestal), sistema_produccion: sistemaProduccion,
        biomasa_arboles: parseFloat(biomasaArboles) || 0, biomasa_cafe: parseFloat(biomasaCafe) || 0, hojarasca_mantillo: parseFloat(hojarascaMantillo) || 0,
        carbono_organico_suelo: parseFloat(carbonoSuelo) || 0, total_stock_carbono: parseFloat(totalStockCarbono) || 0, sync_status: 'pending', creado_en: new Date()
      });

      await sqlite.insert(require('@/data/local/esquema').expedientes).values({
        id: expedienteId, dato_id: datoId, productor_id: productorId, organizacion_inquilino: organizacion, sync_status: 'pending', creado_en: new Date()
      });

      for (const campo of camposDinamicos) {
        if (campo.nombre && campo.valor) {
          await sqlite.insert(require('@/data/local/esquema').variablesDinamicas).values({
            id: Crypto.randomUUID(), dato_id: datoId, nombre: campo.nombre, valor: campo.valor, tipo_dato: 'STRING', sync_status: 'pending', creado_en: new Date()
          });
        }
      }

      const token = await obtenerToken();
      if (token) {
        const { SyncService } = require('@/services/SyncService');
        const syncResult = await SyncService.syncAll(token);
        
        if (!syncResult.success) {
          // Hubo un error devuelto por la API o la red, mostramos el error
          showAlert('Error de Sincronización', syncResult.error || 'Error desconocido al sincronizar', 'error', () => navigation.goBack());
        } else {
          // Sincronización exitosa
          showAlert('Éxito', 'Finca registrada y sincronizada correctamente.', 'success', () => navigation.goBack());
        }
      } else {
        // No hay token, guardado offline
        showAlert('Éxito', 'Registro guardado localmente. Se sincronizará automáticamente al conectarse.', 'success', () => navigation.goBack());
      }

      setStep(1); setPuntos([]); setNombreFinca(''); setCamposDinamicos([]);
    } catch (error) {
      console.error('Error al guardar local:', error);
      showAlert('Error', 'No se pudo guardar el registro en la base de datos local.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return {
    step, setStep, loading, showFullMap, setShowFullMap,
    // Step 1
    nombreProductor, cedulaId, emailProductor, organizacion, setOrganizacion, celular, genero, edad, nivelEducativo,
    // Step 2
    nombreFinca, setNombreFinca, eudrId, provincia, setProvincia, canton, setCanton, parroquia, setParroquia,
    barrio, setBarrio, areaTotal, setAreaTotal, areaCultivada, setAreaCultivada, tenencia, setTenencia,
    latitud, longitud, puntos, isDrawing, setIsDrawing, locating,
    obtenerUbicacionActual, agregarPunto, limpiarMapa, deshacerPunto,
    // Step 3
    indiceShannon, setIndiceShannon, indiceSimpson, setIndiceSimpson, usoSuelo, setUsoSuelo,
    coberturaForestal, sistemaProduccion, setSistemaProduccion, biomasaArboles, setBiomasaArboles,
    biomasaCafe, setBiomasaCafe, hojarascaMantillo, setHojarascaMantillo, carbonoSuelo, setCarbonoSuelo,
    totalStockCarbono, setTotalStockCarbono, camposDinamicos, agregarCampoDinamico, actualizarCampoDinamico, eliminarCampoDinamico,
    // Actions
    guardarRegistro,
  };
};
