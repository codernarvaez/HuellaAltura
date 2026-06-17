import * as turf from '@turf/turf';
import cantonesGeoJson from '../../../assets/geo/cantones.json';

export interface GeoLocationData {
  provincia: string;
  canton: string;
  parroquia?: string;
}

export class GeoLookupService {
  /**
   * Busca la ubicación política (Provincia, Cantón) basada en coordenadas [longitud, latitud].
   */
  static lookupLocation(lng: number, lat: number): GeoLocationData | null {
    const point = turf.point([lng, lat]);
    
    // El archivo cantones.json que descargamos de OCHA tiene niveles de Cantón
    // Propiedades: DPA_DESPRO (Provincia), DPA_DESCAN (Cantón)
    for (const feature of (cantonesGeoJson as any).features) {
      if (turf.booleanPointInPolygon(point, feature)) {
        return {
          provincia: feature.properties.DPA_DESPRO,
          canton: feature.properties.DPA_DESCAN,
          parroquia: feature.properties.DPA_DESPAR || '' // Por si el archivo tuviera parroquias
        };
      }
    }
    
    return null;
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
