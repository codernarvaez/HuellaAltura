import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { theme } from '../../theme/theme';
import { MAPBOX_TOKEN } from '../../mapboxInit';
import {
  ChevronLeft,
  PenTool,
  Undo2,
  RotateCcw,
  MapPin,
  Plus,
  Check,
  LocateFixed,
} from 'lucide-react-native';

export const POLYGON_SOFT_MAX = 200;
export const POLYGON_MIN_POINTS = 3;

const { width: WIN_W, height: WIN_H } = Dimensions.get('window');

/** Calles por defecto (más fiable offline). Satélite si styleMode='satellite'. */
const STYLE_STREET = Mapbox.StyleURL?.Street || 'mapbox://styles/mapbox/streets-v12';
const STYLE_SATELLITE =
  Mapbox.StyleURL?.SatelliteStreet || 'mapbox://styles/mapbox/satellite-streets-v12';

function parseCenter(longitud, latitud) {
  const lon = parseFloat(longitud);
  const lat = parseFloat(latitud);
  if (Number.isFinite(lon) && Number.isFinite(lat)) return [lon, lat];
  return [-79.20422, -3.99313];
}

/**
 * Token + MapView solo tras setAccessToken (evita mapa negro nativo).
 */
export const FarmMapEditor = ({
  latitud,
  longitud,
  puntos = [],
  isDrawing,
  setIsDrawing,
  agregarPunto,
  limpiarMapa,
  deshacerPunto,
  onClose,
  onGpsCenter,
  fullScreen = true,
  styleMode = 'street', // 'street' | 'satellite'
}) => {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const token = MAPBOX_TOKEN;
  const styleUrl = styleMode === 'satellite' ? STYLE_SATELLITE : STYLE_STREET;
  const [hint, setHint] = useState('');
  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [center, setCenter] = useState(() => parseCenter(longitud, latitud));
  const centerRef = useRef(center);
  const [showUserLoc, setShowUserLoc] = useState(false);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    const next = parseCenter(longitud, latitud);
    setCenter(next);
    centerRef.current = next;
  }, [longitud, latitud]);

  const flyTo = useCallback((coord, zoom = 16) => {
    if (!coord || coord.length < 2) return;
    setCenter(coord);
    centerRef.current = coord;
    requestAnimationFrame(() => {
      try {
        cameraRef.current?.setCamera?.({
          centerCoordinate: coord,
          zoomLevel: zoom,
          animationDuration: 500,
        });
      } catch (_) {
        /* ignore */
      }
    });
  }, []);

  const locateGps = useCallback(async () => {
    setGpsBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setHint('Activa el permiso de ubicación para centrar el mapa.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coord = [loc.coords.longitude, loc.coords.latitude];
      flyTo(coord, 17);
      setShowUserLoc(true);
      onGpsCenter?.(loc.coords.latitude, loc.coords.longitude, loc.coords.altitude);
      setHint('GPS listo. Pulsa + o toca el mapa para dibujar el perímetro.');
    } catch (e) {
      console.warn('[FarmMapEditor] GPS', e);
      setHint('GPS no disponible. Mueve el mapa y dibuja con +.');
    } finally {
      setGpsBusy(false);
    }
  }, [flyTo, onGpsCenter]);

  useEffect(() => {
    if (!fullScreen || !token) return undefined;
    setIsDrawing?.(true);
    // GPS después de montar el mapa (no bloquear el primer frame)
    const id = setTimeout(() => {
      locateGps();
    }, 400);
    return () => clearTimeout(id);
  }, [fullScreen, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMapPress = useCallback(
    (e) => {
      if (!isDrawing) return;
      agregarPunto?.(e);
      const next = (puntos?.length || 0) + 1;
      setHint(
        next < POLYGON_MIN_POINTS
          ? `${next}/${POLYGON_MIN_POINTS} mín. — sigue agregando vértices`
          : `${next} vértices — puedes confirmar o seguir afinando`,
      );
    },
    [isDrawing, agregarPunto, puntos?.length],
  );

  const onCameraChanged = useCallback((state) => {
    const c = state?.properties?.center;
    if (Array.isArray(c) && c.length >= 2) centerRef.current = c;
  }, []);

  const addCenterVertex = useCallback(() => {
    if (!isDrawing) setIsDrawing?.(true);
    const [lon, lat] = centerRef.current || center;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    agregarPunto?.({ geometry: { coordinates: [lon, lat] } });
  }, [isDrawing, setIsDrawing, agregarPunto, center]);

  const n = puntos?.length || 0;
  const canConfirm = n >= POLYGON_MIN_POINTS;

  const polygonShape = useMemo(() => {
    if (n < 2) return null;
    if (n === 2) {
      return {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: puntos },
      };
    }
    const coords = [...puntos];
    const a = coords[0];
    const b = coords[coords.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) coords.push(a);
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [coords] },
    };
  }, [puntos, n]);

  const verticesShape = useMemo(() => {
    if (!n) return null;
    return {
      type: 'FeatureCollection',
      features: puntos.map((coord, i) => ({
        type: 'Feature',
        id: `v-${i}`,
        properties: {},
        geometry: { type: 'Point', coordinates: coord },
      })),
    };
  }, [puntos, n]);

  const mapStyle = fullScreen
    ? { width: WIN_W, height: WIN_H }
    : styles.miniMap;

  if (!token) {
    return (
      <View style={[fullScreen ? styles.fullMapContainer : styles.miniMapShell, styles.centerMsg]}>
        <Text style={styles.msgTitle}>Mapbox sin token</Text>
        <Text style={styles.msgBody}>
          Añade EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.… en HAMobile/.env y reinicia Metro
          (npx expo start -c).
        </Text>
        {fullScreen && (
          <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
            <Text style={styles.confirmBtnText}>Volver</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const mapNode = (
    <Mapbox.MapView
      style={mapStyle}
      styleURL={styleUrl}
      onPress={fullScreen && isDrawing ? onMapPress : undefined}
      onCameraChanged={fullScreen ? onCameraChanged : undefined}
      onDidFinishLoadingMap={() => {
        setMapReady(true);
        setMapError('');
      }}
      onMapLoadingError={(e) => {
        const msg =
          e?.nativeEvent?.message ||
          e?.message ||
          'Error cargando el estilo Mapbox (token o red).';
        console.warn('[FarmMapEditor] map load error', msg);
        setMapError(String(msg));
      }}
      logoEnabled={false}
      attributionEnabled={false}
      compassEnabled={fullScreen}
      scaleBarEnabled={false}
      scrollEnabled={fullScreen}
      zoomEnabled={fullScreen}
      pitchEnabled={false}
      rotateEnabled={false}
      {...(Platform.OS === 'android' ? { surfaceView: true } : {})}
    >
      <Mapbox.Camera
        ref={cameraRef}
        centerCoordinate={center}
        zoomLevel={fullScreen ? 16 : 13}
        animationMode="moveTo"
        animationDuration={0}
      />
      {polygonShape && (
        <Mapbox.ShapeSource id="farmPoly" shape={polygonShape}>
          {n >= 3 ? (
            <Mapbox.FillLayer
              id="farmFill"
              style={{ fillColor: theme.colors.secondary, fillOpacity: 0.35 }}
            />
          ) : null}
          <Mapbox.LineLayer
            id="farmLine"
            style={{ lineColor: '#ffffff', lineWidth: 3 }}
          />
        </Mapbox.ShapeSource>
      )}
      {fullScreen && verticesShape && (
        <Mapbox.ShapeSource id="farmVerts" shape={verticesShape}>
          <Mapbox.CircleLayer
            id="farmVertCircles"
            style={{
              circleRadius: 7,
              circleColor: theme.colors.secondary,
              circleStrokeWidth: 2,
              circleStrokeColor: '#fff',
            }}
          />
        </Mapbox.ShapeSource>
      )}
      {fullScreen && showUserLoc ? <Mapbox.UserLocation visible /> : null}
    </Mapbox.MapView>
  );

  if (!fullScreen) {
    return (
      <View style={styles.miniMapShell}>
        {mapNode}
        {!!mapError && (
          <View style={styles.miniError}>
            <Text style={styles.miniErrorText} numberOfLines={2}>
              {mapError}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fullMapContainer}>
      <StatusBar barStyle="light-content" />
      {mapNode}
      {!mapReady && !mapError && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando mapa…</Text>
        </View>
      )}
      {!!mapError && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.msgTitle}>Mapa no cargó</Text>
          <Text style={styles.msgBody}>{mapError}</Text>
        </View>
      )}

      <View pointerEvents="none" style={styles.crosshairWrap}>
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
        <View style={styles.crosshairDot} />
      </View>

      <View style={[styles.mapTopOverlay, { top: insets.top || 10 }]}>
        <View style={styles.mapToolbar}>
          <TouchableOpacity style={styles.toolbarIconButton} onPress={onClose}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.toolbarSpacer} />
          <View style={styles.toolsContainer}>
            <View style={styles.actionBadge}>
              <MapPin size={12} color="#fff" />
              <Text style={styles.actionBadgeText}>{n}</Text>
            </View>
            <TouchableOpacity
              style={styles.toolButton}
              onPress={locateGps}
              disabled={gpsBusy}
            >
              {gpsBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <LocateFixed size={18} color="#fff" />
              )}
              <Text style={styles.toolButtonText}>GPS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolButton, isDrawing && styles.toolButtonActive]}
              onPress={() => setIsDrawing(!isDrawing)}
            >
              <PenTool size={18} color="#fff" />
              <Text style={styles.toolButtonText}>
                {isDrawing ? 'Dibujando' : 'Dibujar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolIconButtonSmall}
              onPress={deshacerPunto}
              disabled={n === 0}
            >
              <Undo2 size={18} color={n === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolIconButtonSmall}
              onPress={limpiarMapa}
              disabled={n === 0}
            >
              <RotateCcw size={18} color={n === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.fabAdd, { bottom: (insets.bottom || 0) + 118 }]}
        onPress={addCenterVertex}
        activeOpacity={0.85}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.bottomPanel, { paddingBottom: (insets.bottom || 0) + 12 }]}>
        <Text style={styles.statusText}>
          {hint ||
            (n === 0
              ? 'Pulsa GPS, luego + o toca el mapa para el perímetro (sin límite de vértices).'
              : canConfirm
                ? `${n} vértices — confirma o sigue afinando`
                : `${n}/${POLYGON_MIN_POINTS} mín.`)}
        </Text>
        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          disabled={!canConfirm}
          onPress={() => {
            setIsDrawing(false);
            onClose?.();
          }}
        >
          <Check size={18} color={canConfirm ? theme.colors.onPrimaryFixed : '#999'} />
          <Text
            style={[styles.confirmBtnText, !canConfirm && styles.confirmBtnTextDisabled]}
          >
            {canConfirm ? `Usar polígono (${n})` : `Faltan ${POLYGON_MIN_POINTS - n}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  miniMapShell: { flex: 1, backgroundColor: '#1a2e24', overflow: 'hidden' },
  miniMap: { flex: 1, width: '100%', height: '100%' },
  miniError: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 8,
  },
  miniErrorText: { color: '#fff', fontSize: 11, textAlign: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,46,36,0.85)',
    zIndex: 20,
    padding: 24,
  },
  loadingText: { color: '#fff', marginTop: 10, fontWeight: '600' },
  fullMapContainer: {
    flex: 1,
    width: WIN_W,
    height: WIN_H,
    backgroundColor: '#1a2e24',
  },
  centerMsg: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  msgTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  msgBody: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  mapTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 12,
  },
  mapToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius: 16,
    padding: 6,
    marginTop: 8,
  },
  toolbarIconButton: { padding: 10 },
  toolbarSpacer: { flex: 1 },
  toolsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  actionBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  toolButtonActive: { backgroundColor: theme.colors.secondary },
  toolButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  toolIconButtonSmall: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
  },
  crosshairWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  crosshairH: { position: 'absolute', width: 28, height: 2, backgroundColor: '#fff' },
  crosshairV: { position: 'absolute', width: 2, height: 28, backgroundColor: '#fff' },
  crosshairDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  fabAdd: {
    position: 'absolute',
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
    elevation: 8,
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 11,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
  },
  statusText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryFixedDim,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: '80%',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
  confirmBtnText: {
    color: theme.colors.onPrimaryFixed,
    fontWeight: '700',
    fontSize: 14,
  },
  confirmBtnTextDisabled: { color: '#999' },
});
