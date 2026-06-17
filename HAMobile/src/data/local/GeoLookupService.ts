import * as turf from '@turf/turf';
import cantonesGeoJson from '../../../assets/geo/EC_Cantones.json';
import parroquiasLojaGeoJson from '../../../assets/geo/Parroquias_Loja.json';

export interface GeoLocationData {
  provincia: string;
  canton: string;
  parroquia?: string;
}

export class GeoLookupService {
  /**
   * Busca la ubicación política (Provincia, Cantón, Parroquia) basada en coordenadas [longitud, latitud].
   */
  static lookupLocation(lng: number, lat: number): GeoLocationData | null {
    const point = turf.point([lng, lat]);
    let result: GeoLocationData | null = null;
    
    // 1. Buscar en Cantones (Nivel Nacional)
    for (const feature of (cantonesGeoJson as any).features) {
      if (turf.booleanPointInPolygon(point, feature)) {
        result = {
          provincia: feature.properties.DPA_DESPRO,
          canton: feature.properties.DPA_DESCAN,
          parroquia: ''
        };
        break;
      }
    }

    // 2. Si es Loja, buscar la Parroquia específica
    if (result && result.provincia.toUpperCase() === 'LOJA') {
      for (const feature of (parroquiasLojaGeoJson as any).features) {
        if (turf.booleanPointInPolygon(point, feature)) {
          result.parroquia = feature.properties.NOMBRE;
          break;
        }
      }
    }
    
    return result;
  }

  /**
   * Calcula el centroide de un polígono y busca su ubicación política.
   */
  static lookupPolygonLocation(puntos: number[][]): GeoLocationData | null {
    if (!puntos || puntos.length < 3) return null;
    
    try {
      // Cerrar el polígono si no está cerrado para Turf
      const coords = [...puntos];
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
        coords.push(coords[0]);
      }
      
      const polygon = turf.polygon([coords]);
      const centroid = turf.centroid(polygon);
      const [lng, lat] = centroid.geometry.coordinates;
      
      return this.lookupLocation(lng, lat);
    } catch (error) {
      console.error('Error calculando ubicación del polígono:', error);
      return null;
    }
  }
}
