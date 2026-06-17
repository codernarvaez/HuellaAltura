import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@env';
import { theme } from '../../theme/theme';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
import { 
  ChevronLeft,
  PenTool,
  CheckCircle2,
  Undo2,
  RotateCcw,
  MapPin
} from 'lucide-react-native';

import * as Crypto from 'expo-crypto';

// Helper para calcular el bounding box del polígono
const getBounds = (points) => {
  if (!points || points.length < 2) return null;
  let minLon = points[0][0];
  let maxLon = points[0][0];
  let minLat = points[0][1];
  let maxLat = points[0][1];

  points.forEach(([lon, lat]) => {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  // Ajustar si es un solo punto o línea vertical/horizontal para evitar errores de Mapbox
  if (minLon === maxLon) { minLon -= 0.001; maxLon += 0.001; }
  if (minLat === maxLat) { minLat -= 0.001; maxLat += 0.001; }

  return {
    ne: [maxLon, maxLat],
    sw: [minLon, minLat],
    paddingLeft: 40,
    paddingRight: 40,
    paddingTop: 40,
    paddingBottom: 40,
  };
};

// Componente de Mapa Memoizado para evitar re-renders innecesarios
const MapViewMemo = React.memo(({ 
  latitud, 
  longitud, 
  puntos, 
  isDrawing, 
  agregarPunto, 
  renderPolygon, 
  renderPoints, 
  fullScreen = false 
}) => {
  // Solo calcular bounds para el minimapa para mantenerlo centrado. 
  // En pantalla completa dejamos que el usuario controle la cámara.
  const bounds = React.useMemo(() => !fullScreen ? getBounds(puntos) : null, [puntos, fullScreen]);

  return (
    <Mapbox.MapView 
      style={fullScreen ? styles.fullMap : styles.miniMap} 
      onPress={agregarPunto}
      logoEnabled={false}
      attributionEnabled={false}
      styleURL={Mapbox.StyleURL.Satellite}
      scrollEnabled={fullScreen}
      zoomEnabled={fullScreen}
      pitchEnabled={fullScreen}
      rotateEnabled={fullScreen}
    >
      <Mapbox.Camera
        zoomLevel={fullScreen ? 16 : 14}
        centerCoordinate={!bounds ? [parseFloat(longitud), parseFloat(latitud)] : undefined}
        bounds={bounds || undefined}
        animationMode="moveTo"
        animationDuration={0}
      />
      {renderPolygon()}
      {fullScreen && renderPoints()}
      {fullScreen && <Mapbox.UserLocation />}
    </Mapbox.MapView>
  );
},
 (prevProps, nextProps) => {
  return (
    prevProps.latitud === nextProps.latitud &&
    prevProps.longitud === nextProps.longitud &&
    prevProps.puntos === nextProps.puntos &&
    prevProps.isDrawing === nextProps.isDrawing &&
    prevProps.fullScreen === nextProps.fullScreen
  );
});

export const FarmMapEditor = ({
  latitud,
  longitud,
  puntos,
  isDrawing,
  setIsDrawing,
  agregarPunto,
  limpiarMapa,
  deshacerPunto,
  onClose,
  fullScreen = true
}) => {
  const insets = useSafeAreaInsets();

  const renderPolygon = React.useCallback(() => {
    if (puntos.length < 2) return null;
    const coords = puntos.length >= 3 ? [...puntos, puntos[0]] : puntos;
    return (
      <Mapbox.ShapeSource
        id="polygonSource"
        shape={{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } }}
      >
        <Mapbox.FillLayer id="polygonFill" style={{ fillColor: theme.colors.secondary, fillOpacity: 0.4 }} />
        <Mapbox.LineLayer id="polygonLine" style={{ lineColor: '#fff', lineWidth: 3 }} />
      </Mapbox.ShapeSource>
    );
  }, [puntos]);

  const renderPoints = React.useCallback(() => {
    return puntos.map((p, i) => (
      <Mapbox.PointAnnotation key={`p-${i}`} id={`p-${i}`} coordinate={p}>
        <View style={styles.pointMarker} />
      </Mapbox.PointAnnotation>
    ));
  }, [puntos]);

  if (!fullScreen) {
    return (
      <MapViewMemo 
        latitud={latitud} 
        longitud={longitud} 
        puntos={puntos} 
        isDrawing={false} 
        agregarPunto={() => {}} 
        renderPolygon={renderPolygon} 
        renderPoints={() => null} 
        fullScreen={false}
      />
    );
  }

  return (
    <View style={styles.fullMapContainer}>
      <StatusBar barStyle="light-content" />
      <MapViewMemo 
        fullScreen={true} 
        latitud={latitud} 
        longitud={longitud} 
        puntos={puntos} 
        isDrawing={isDrawing} 
        agregarPunto={agregarPunto} 
        renderPolygon={renderPolygon} 
        renderPoints={renderPoints} 
      />
      
      {/* Overlay Superior: Toolbar de Herramientas Minimalista */}
      <View style={[styles.mapTopOverlay, { top: insets.top || 10 }]}>
        <View style={styles.mapToolbar}>
          <TouchableOpacity style={styles.toolbarIconButton} onPress={onClose}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.toolbarSpacer} />
          
          <View style={styles.toolsContainer}>
            {/* Indicador de vértices dentro del panel de acciones */}
            <View style={styles.actionBadge}>
              <MapPin size={12} color={theme.colors.surface} />
              <Text style={styles.actionBadgeText}>{puntos.length}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.toolButton, isDrawing && styles.toolButtonActive]} 
              onPress={() => setIsDrawing(!isDrawing)}
            >
              {isDrawing ? <CheckCircle2 size={18} color="#fff" /> : <PenTool size={18} color="#fff" />}
              <Text style={styles.toolButtonText}>{isDrawing ? 'Listo' : 'Dibujar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.toolIconButtonSmall} 
              onPress={deshacerPunto} 
              disabled={puntos.length === 0}
            >
              <Undo2 size={18} color={puntos.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.toolIconButtonSmall} 
              onPress={limpiarMapa} 
              disabled={puntos.length === 0}
            >
              <RotateCcw size={18} color={puntos.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Info flotante de ayuda */}
      {!isDrawing && puntos.length < 3 && (
        <View style={styles.mapFloatingInfo}>
          <Text style={styles.mapFloatingInfoText}>Toca 'Dibujar' para empezar</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  miniMap: { flex: 1 },
  fullMapContainer: { flex: 1, backgroundColor: '#000' },
  fullMap: { flex: 1 },
  mapTopOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 16 },
  mapToolbar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.75)', 
    borderRadius: theme.roundness.xl, 
    padding: 6, 
    marginTop: 10, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  toolbarIconButton: { padding: 10, borderRadius: 8 },
  toolbarSpacer: { flex: 1 },
  toolsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.roundness.md,
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  actionBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4
  },
  toolButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.colors.primaryContainer, 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: theme.roundness.lg, 
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  toolButtonActive: { backgroundColor: theme.colors.secondary },
  toolButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  toolIconButtonSmall: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.roundness.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mapFloatingInfo: { 
    position: 'absolute', 
    bottom: 40, 
    left: '20%', 
    right: '20%', 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    padding: 12, 
    borderRadius: theme.roundness.xl, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  mapFloatingInfoText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  pointMarker: { height: 12, width: 12, borderRadius: 6, backgroundColor: theme.colors.secondary, borderWidth: 2, borderColor: '#fff' },
});
