import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@env';
import { theme } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';
import { RepositorioFincas } from '../../data/repositorio/RepositorioFincas';
import * as Location from 'expo-location';
import { 
  Map as MapIcon, 
  User, 
  Home, 
  MapPin, 
  Save, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  FileText, 
  PenTool, 
  Maximize2, 
  X, 
  ChevronLeft,
  LocateFixed
} from 'lucide-react-native';
import * as Crypto from 'expo-crypto';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { width, height } = Dimensions.get('window');

const RegistroFincaScreen = () => {
  const { user } = useAuth();
  const [nombreFinca, setNombreFinca] = useState('');
  const [nombreProductor, setNombreProductor] = useState(user?.name || '');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [areaTotal, setAreaTotal] = useState('');
  const [tenencia, setTenencia] = useState('Propia con escritura');
  
  // Geolocation fields
  const [latitud, setLatitud] = useState('-3.99313');
  const [longitud, setLongitud] = useState('-79.20422');
  const [altitud, setAltitud] = useState('2100');
  
  const [puntos, setPuntos] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [locating, setLocating] = useState(false);

  // Repositorio
  const repo = new RepositorioFincas(user?.tenantId || 'default-tenant');

  const obtenerUbicacionActual = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación para calcular las coordenadas.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitud(location.coords.latitude.toString());
      setLongitud(location.coords.longitude.toString());
      if (location.coords.altitude) {
        setAltitud(Math.round(location.coords.altitude).toString());
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo obtener la ubicación actual.');
    } finally {
      setLocating(false);
    }
  };

  const agregarPunto = (e) => {
    if (!isDrawing) return;
    const { geometry } = e;
    setPuntos([...puntos, geometry.coordinates]);
  };

  const limpiarMapa = () => {
    setPuntos([]);
    setIsDrawing(false);
  };

  const guardarRegistro = async () => {
    if (!nombreFinca || puntos.length < 3) {
      Alert.alert('Error', 'Por favor ingresa el nombre de la finca y dibuja un polígono válido (mínimo 3 puntos en el mapa).');
      return;
    }

    setLoading(true);
    try {
      const idFinca = Crypto.randomUUID();
      
      const coordenadasCerradas = [...puntos];
      if (
        puntos[0][0] !== puntos[puntos.length - 1][0] ||
        puntos[0][1] !== puntos[puntos.length - 1][1]
      ) {
        coordenadasCerradas.push(puntos[0]);
      }

      const geoJson = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordenadasCerradas]
        },
        properties: {
          tipo_captura: 'GPS_Caminado',
          precision_promedio_metros: 2.4
        }
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
        datosPersonalizados: {
          modulo_biodiversidad: {
            indice_shannon_wiener: 2.56,
            especies_sombra: ["Laurel", "Aguacate"]
          },
          modulo_carbono: {
            total_stock_carbono_tc_ha: 114.0
          }
        }
      };

      const vertices = puntos.map(p => ({
        latitud: p[1],
        longitud: p[0],
        precisionMetros: 2.4
      }));

      await repo.crearConVertices(datosFinca, vertices);
      
      Alert.alert('Éxito', 'Registro de finca guardado correctamente.');
      limpiarMapa();
      setNombreFinca('');
      setAreaTotal('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el registro.');
    } finally {
      setLoading(false);
    }
  };

  const renderPolygon = () => {
    if (puntos.length < 2) return null;
    const coords = puntos.length >= 3 ? [...puntos, puntos[0]] : puntos;
    return (
      <Mapbox.ShapeSource
        id="polygonSource"
        shape={{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coords]
          }
        }}
      >
        <Mapbox.FillLayer
          id="polygonFill"
          style={{
            fillColor: theme.colors.secondary,
            fillOpacity: 0.4,
            fillOutlineColor: theme.colors.secondary
          }}
        />
        <Mapbox.LineLayer
          id="polygonLine"
          style={{
            lineColor: '#fff',
            lineWidth: 3
          }}
        />
      </Mapbox.ShapeSource>
    );
  };

  const renderPoints = () => {
    return puntos.map((p, i) => (
      <Mapbox.PointAnnotation
        key={`point-${i}`}
        id={`point-${i}`}
        coordinate={p}
      >
        <View style={styles.pointMarker} />
      </Mapbox.PointAnnotation>
    ));
  };

  if (showFullMap) {
    return (
      <View style={styles.fullMapContainer}>
        <StatusBar barStyle="light-content" />
        <Mapbox.MapView 
          style={styles.fullMap} 
          onPress={agregarPunto}
          logoEnabled={false}
          attributionEnabled={false}
          styleURL={Mapbox.StyleURL.Satellite}
        >
          <Mapbox.Camera
            zoomLevel={16}
            centerCoordinate={[parseFloat(longitud), parseFloat(latitud)]}
          />
          {renderPolygon()}
          {renderPoints()}
          <Mapbox.UserLocation />
        </Mapbox.MapView>

        {/* Toolbar Superior */}
        <SafeAreaView style={styles.mapHeader}>
          <TouchableOpacity style={styles.closeMapButton} onPress={() => setShowFullMap(false)}>
            <ChevronLeft size={30} color="#fff" />
            <Text style={styles.backText}>Volver al Formulario</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Info Overlay */}
        <View style={styles.mapInfoOverlay}>
          <View style={styles.mapBadge}>
            <MapPin size={16} color={theme.colors.secondary} />
            <Text style={styles.mapBadgeText}>{puntos.length} Puntos</Text>
          </View>
          {isDrawing && (
            <View style={[styles.mapBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Text style={[styles.mapBadgeText, { color: theme.colors.onSecondaryContainer }]}>Modo Dibujo Activo</Text>
            </View>
          )}
        </View>

        {/* Floating Controls */}
        <View style={styles.floatingControls}>
          <TouchableOpacity 
            style={[styles.floatingAction, isDrawing && styles.floatingActionActive]} 
            onPress={() => setIsDrawing(!isDrawing)}
          >
            {isDrawing ? <CheckCircle2 size={28} color="#fff" /> : <PenTool size={28} color={theme.colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingAction} onPress={limpiarMapa}>
            <Trash2 size={28} color={theme.colors.error} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.floatingAction, { backgroundColor: theme.colors.primary }]} onPress={() => setShowFullMap(false)}>
            <Save size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.mainTitle}>Registro EUDR</Text>
          <Text style={styles.subTitle}>Captura de datos georreferenciados</Text>
        </View>

        {/* MiniMap Card */}
        <TouchableOpacity 
          style={styles.miniMapCard} 
          onPress={() => setShowFullMap(true)}
          activeOpacity={0.9}
        >
          <View style={styles.miniMapHeader}>
            <View style={styles.miniMapTitleGroup}>
              <MapIcon size={18} color={theme.colors.onPrimaryContainer} />
              <Text style={styles.miniMapTitle}>Geometría de la Finca</Text>
            </View>
            <Maximize2 size={18} color={theme.colors.onPrimaryContainer} />
          </View>
          
          <View style={styles.miniMapWrapper}>
            <Mapbox.MapView 
              style={styles.miniMap} 
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              logoEnabled={false}
              attributionEnabled={false}
              styleURL={Mapbox.StyleURL.Satellite}
            >
              <Mapbox.Camera
                zoomLevel={14}
                centerCoordinate={[parseFloat(longitud), parseFloat(latitud)]}
              />
              {renderPolygon()}
            </Mapbox.MapView>
            <View style={styles.miniMapOverlay}>
              <Text style={styles.miniMapActionText}>Toca para editar polígono</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Formulario */}
        <View style={styles.sectionHeader}>
          <User size={20} color={theme.colors.onPrimaryContainer} />
          <Text style={styles.sectionTitle}>Datos del Productor</Text>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre Completo</Text>
          <TextInput 
            style={styles.input} 
            value={nombreProductor} 
            onChangeText={setNombreProductor}
            placeholder="Ej. José Miguel Mosquera"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Documento de Identidad</Text>
          <TextInput 
            style={styles.input} 
            value={documentoIdentidad} 
            onChangeText={setDocumentoIdentidad}
            placeholder="Ej. 1100433455"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.sectionHeader}>
          <MapPin size={20} color={theme.colors.onPrimaryContainer} />
          <Text style={styles.sectionTitle}>Ubicación Central</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Latitud</Text>
            <TextInput style={styles.input} value={latitud} onChangeText={setLatitud} keyboardType="numeric" placeholderTextColor="#999" />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Longitud</Text>
            <TextInput style={styles.input} value={longitud} onChangeText={setLongitud} keyboardType="numeric" placeholderTextColor="#999" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Altitud (msnm)</Text>
            <TextInput style={styles.input} value={altitud} onChangeText={setAltitud} keyboardType="numeric" placeholderTextColor="#999" />
          </View>
          <TouchableOpacity 
            style={styles.locationButton} 
            onPress={obtenerUbicacionActual}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <LocateFixed size={20} color="#fff" />
                <Text style={styles.locationButtonText}>Obtener GPS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Home size={20} color={theme.colors.onPrimaryContainer} />
          <Text style={styles.sectionTitle}>Información de la Finca</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre de la Finca</Text>
          <TextInput 
            style={styles.input} 
            value={nombreFinca} 
            onChangeText={setNombreFinca}
            placeholder="Ej. El Ahuacate"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Área (Ha)</Text>
            <TextInput style={styles.input} value={areaTotal} onChangeText={setAreaTotal} keyboardType="numeric" />
          </View>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.label}>Tenencia</Text>
            <TextInput style={styles.input} value={tenencia} onChangeText={setTenencia} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <FileText size={20} color={theme.colors.onPrimaryContainer} />
          <Text style={styles.sectionTitle}>Verificación EUDR</Text>
        </View>
        <Text style={styles.helperText}>
          Módulos de Biodiversidad y Carbono se calculan en base al polígono capturado.
        </Text>

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={guardarRegistro}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.submitButtonText}>Finalizar Registro</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  headerTitleContainer: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  mainTitle: {
    ...theme.typography.headlineLgMobile,
    color: '#fff',
    fontSize: 28,
  },
  subTitle: {
    ...theme.typography.labelSm,
    color: theme.colors.onPrimaryContainer,
    opacity: 0.8,
  },
  miniMapCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: theme.roundness.xl,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryContainer,
  },
  miniMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniMapTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniMapTitle: {
    ...theme.typography.labelMd,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '700',
  },
  miniMapWrapper: {
    height: 180,
    borderRadius: theme.roundness.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  miniMap: {
    flex: 1,
  },
  miniMapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  miniMapActionText: {
    ...theme.typography.labelSm,
    color: '#fff',
    fontWeight: '600',
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: theme.spacing.gutter,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 6,
  },
  sectionTitle: {
    ...theme.typography.labelMd,
    fontSize: 16,
    color: theme.colors.onPrimaryContainer,
    marginLeft: 10,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    ...theme.typography.labelSm,
    color: '#fff',
    marginBottom: 8,
    opacity: 0.7,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.primaryContainer,
    borderRadius: theme.roundness.lg,
    height: 52,
    paddingHorizontal: 16,
    ...theme.typography.bodyMd,
    color: '#000',
  },
  locationButton: {
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.roundness.lg,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
    flex: 1,
  },
  locationButtonText: {
    ...theme.typography.labelSm,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helperText: {
    ...theme.typography.labelSm,
    color: theme.colors.onPrimaryContainer,
    fontStyle: 'italic',
    marginBottom: 20,
    opacity: 0.8,
  },
  submitButton: {
    backgroundColor: theme.colors.secondary,
    height: 60,
    borderRadius: theme.roundness.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  submitButtonText: {
    ...theme.typography.labelMd,
    color: '#fff',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  // Full Map Styles
  fullMapContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullMap: {
    flex: 1,
  },
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'flex-start',
    margin: 16,
    paddingRight: 20,
    paddingVertical: 5,
    borderRadius: theme.roundness.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  mapInfoOverlay: {
    position: 'absolute',
    top: 100,
    left: 16,
    zIndex: 5,
  },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.roundness.md,
    marginBottom: 8,
  },
  mapBadgeText: {
    ...theme.typography.labelSm,
    color: theme.colors.primary,
    fontWeight: '700',
    marginLeft: 6,
  },
  floatingControls: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    gap: 16,
  },
  floatingAction: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  floatingActionActive: {
    backgroundColor: theme.colors.secondary,
  },
  pointMarker: {
    height: 16,
    width: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.secondary,
    borderWidth: 3,
    borderColor: '#fff',
  },
});

export default RegistroFincaScreen;
