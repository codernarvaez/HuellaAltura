/**
 * Inicializa Mapbox antes de montar cualquier MapView.
 * Si setAccessToken llega tarde, Android muestra mapa negro.
 */
import Mapbox from '@rnmapbox/maps';
import Constants from 'expo-constants';

function resolveToken() {
  const candidates = [
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    // Alias por si el .env copia el nombre de HAFront
    process.env.PUBLIC_MAPBOX_ACCESS_TOKEN,
    Constants.expoConfig?.extra?.mapboxAccessToken,
    Constants.manifest?.extra?.mapboxAccessToken,
    Constants.manifest2?.extra?.expoClient?.extra?.mapboxAccessToken,
  ];
  for (const c of candidates) {
    const t = (c || '').trim();
    if (t.startsWith('pk.')) return t;
  }
  return '';
}

export const MAPBOX_TOKEN = resolveToken();

if (MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
  if (__DEV__) {
    console.log('[mapboxInit] token pk.…' + MAPBOX_TOKEN.slice(-6));
  }
} else if (__DEV__) {
  console.warn('[mapboxInit] Falta EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.…');
}
