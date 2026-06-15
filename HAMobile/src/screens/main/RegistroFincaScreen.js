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
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@env';
import { theme } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';
import { RepositorioFincas } from '../../data/repositorio/RepositorioFincas';
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
  PenTool
} from 'lucide-react-native';
import * as Crypto from 'expo-crypto';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { width } = Dimensions.get('window');

const RegistroFincaScreen = () => {
  const { user } = useAuth();
  const [nombreFinca, setNombreFinca] = useState('');
  const [nombreProductor, setNombreProductor] = useState(user?.name || '');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [areaTotal, setAreaTotal] = useState('');
  const [tenencia, setTenencia] = useState('Propia con escritura');
  
  const [puntos, setPuntos] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Repositorio
  const repo = new RepositorioFincas(user?.tenantId || 'default-tenant');

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
      Alert.alert('Error', 'Por favor ingresa el nombre de la finca y dibuja un polígono válido (mínimo 3 puntos).');
      return;
    }

    setLoading(true);
    try {
      const idFinca = Crypto.randomUUID();
      
      // Cerrar el polígono para el GeoJSON si no está cerrado
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

      // Payload Flex-Core y Otros (Mock)
      const datosFinca = {
        id: idFinca,
        nombre: nombreFinca,
        productorId: user?.id || 'anon',
        geometriaGeoJson: geoJson,
        areaGeodesicaHectareas: parseFloat(areaTotal) || 0,
        tipoCaptura: 'GPS_WALK',
        gpsAccuracyMeters: 2.4,
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
      
      Alert.alert('Éxito', 'Registro de finca guardado y encolado para sincronización.');
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
    
    // Para visualización, cerramos el polígono si hay 3 o más puntos
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
            fillColor: theme.colors.primary,
            fillOpacity: 0.3,
            fillOutlineColor: theme.colors.primary
          }}
        />
        <Mapbox.LineLayer
          id="polygonLine"
          style={{
            lineColor: theme.colors.primary,
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

  return (
    <View style={styles.container}>
      {/* Mapa */}
      <View style={styles.mapContainer}>
        <Mapbox.MapView 
          style={styles.map} 
          onPress={agregarPunto}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <Mapbox.Camera
            zoomLevel={15}
            centerCoordinate={[-79.2198, -4.3129]} // Loja, Ecuador (Placeholder)
          />
          {renderPolygon()}
          {renderPoints()}
        </Mapbox.MapView>

        {/* Controles del Mapa */}
        <View style={styles.mapOverlay}>
          <TouchableOpacity 
            style={[styles.mapButton, isDrawing && styles.mapButtonActive]} 
            onPress={() => setIsDrawing(!isDrawing)}
          >
            {isDrawing ? (
              <CheckCircle2 size={24} color="#fff" />
            ) : (
              <PenTool size={24} color={theme.colors.primary} />
            )}
            <Text style={[styles.mapButtonText, isDrawing && { color: '#fff' }]}>
              {isDrawing ? 'Finalizar' : 'Dibujar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mapButton} onPress={limpiarMapa}>
            <Trash2 size={24} color={theme.colors.error} />
            <Text style={[styles.mapButtonText, { color: theme.colors.error }]}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
        <View style={styles.sectionHeader}>
          <User size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Datos del Productor</Text>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre Completo</Text>
          <TextInput 
            style={styles.input} 
            value={nombreProductor} 
            onChangeText={setNombreProductor}
            placeholder="Ej. José Miguel Mosquera"
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
          />
        </View>

        <View style={styles.sectionHeader}>
          <Home size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Información de la Finca</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre de la Finca</Text>
          <TextInput 
            style={styles.input} 
            value={nombreFinca} 
            onChangeText={setNombreFinca}
            placeholder="Ej. El Ahuacate"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Área (Ha)</Text>
            <TextInput 
              style={styles.input} 
              value={areaTotal} 
              onChangeText={setAreaTotal}
              placeholder="0.0"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.label}>Tenencia</Text>
            <TextInput 
              style={styles.input} 
              value={tenencia} 
              onChangeText={setTenencia}
              placeholder="Ej. Propia con escritura"
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <FileText size={20} color={theme.colors.secondary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.secondary }]}>Módulos Flex-Core (EUDR)</Text>
        </View>
        <Text style={styles.helperText}>
          Los módulos de Biodiversidad y Carbono se activarán automáticamente según el perfil del inquilino.
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
              <Save size={24} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Guardar Registro EUDR</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
  },
  mapButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.roundness.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  mapButtonText: {
    ...theme.typography.labelSm,
    marginLeft: 4,
    color: theme.colors.onSurface,
  },
  pointMarker: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: theme.spacing.gutter,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
    paddingBottom: 8,
  },
  sectionTitle: {
    ...theme.typography.headlineMd,
    fontSize: 18,
    color: theme.colors.primary,
    marginLeft: 8,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    ...theme.typography.labelSm,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.roundness.md,
    height: 50,
    paddingHorizontal: 16,
    ...theme.typography.bodyMd,
    color: theme.colors.onSurface,
  },
  row: {
    flexDirection: 'row',
  },
  helperText: {
    ...theme.typography.labelSm,
    color: theme.colors.outline,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    height: 60,
    borderRadius: theme.roundness.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    ...theme.typography.labelMd,
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default RegistroFincaScreen;
