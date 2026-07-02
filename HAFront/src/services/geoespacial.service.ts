// src/services/geoespacial.service.ts
import { API_URL } from "./Api_Base";

const GEOESPACIAL_BASE = `${API_URL}/api/v1/geoespacial`;

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface GeoespacialResponse {
  success: boolean;
  archivo_tipo: string;
  coordenadas: number[][];
  centro: {
    latitud: number;
    longitud: number;
  };
  ubicacion: {
    provincia: string;
    canton: string;
    parroquia?: string;
    sector?: string;
  };
  propiedades: {
    name?: string;
    description?: string;
  };
  validacion_eudr: {
    deforestacion_detectada: boolean;
    porcentaje: number;
    fecha_analisis: string;
    fuente: string;
    estado_eudr: string;
  };
  area_hectareas: number;
  sugerencias: {
    nombre: string;
    provincia: string;
    canton: string;
    parroquia: string;
    sector: string;
    area_total_ha: number;
  };
}

export interface FincaFromFileResponse {
  id: string;
  nombre: string;
  usuario_id: string;
  provincia: string;
  canton: string;
  parroquia?: string;
  sector?: string;
  latitud: number;
  longitud: number;
  area_total_ha: number;
  area_cultivada_ha: number;
  poligono: any;
  eudr_id: string;
  creado_en: string;
}

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export class GeoespacialService {
  /**
   * Carga un archivo geoespacial (GPX, KML, GeoJSON) y extrae la información
   * Endpoint: POST /api/v1/geoespacial/publico/cargar-poligono
   */
  static async cargarArchivo(archivo: File, token?: string): Promise<GeoespacialResponse> {
    console.log("📡 Enviando archivo:", archivo.name, "(" + archivo.type + ", " + archivo.size + " bytes)");
    
    const formData = new FormData();
    formData.append("archivo", archivo);

    const url = `${GEOESPACIAL_BASE}/publico/cargar-poligono`;
    console.log("📡 URL:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders(token),
      body: formData,
    });

    console.log("📡 Response status:", response.status);

    const data = await response.json();
    console.log("📡 Response data:", data);

    if (!response.ok) {
      console.error("❌ Error en la respuesta:", data);
      throw new Error(data.detail || "Error al procesar el archivo");
    }

    console.log("✅ Archivo procesado correctamente");
    return data;
  }

  /**
   * Carga un archivo y crea una finca automáticamente
   * Endpoint: POST /api/v1/geoespacial/cargar-poligono
   */
  static async cargarYCrearFinca(
    archivo: File,
    nombreFinca?: string,
    token?: string
  ): Promise<FincaFromFileResponse> {
    console.log("📡 Creando finca desde archivo:", archivo.name);
    
    const formData = new FormData();
    formData.append("archivo", archivo);
    if (nombreFinca) {
      formData.append("nombre_finca", nombreFinca);
    }

    const url = `${GEOESPACIAL_BASE}/cargar-poligono`;
    console.log("📡 URL:", url);
    console.log("📡 Nombre finca:", nombreFinca || "Auto-generado");

    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders(token),
      body: formData,
    });

    console.log("📡 Response status:", response.status);

    const data = await response.json();
    console.log("📡 Response data:", data);

    if (!response.ok) {
      console.error("❌ Error en la respuesta:", data);
      throw new Error(data.detail || "Error al crear finca desde archivo");
    }

    console.log("✅ Finca creada correctamente:", data);
    return data;
  }

  /**
   * Valida la deforestación EUDR de una finca
   * Endpoint: POST /api/v1/geoespacial/{finca_id}/validar-eudr
   */
  static async validarEudr(fincaId: string, token?: string): Promise<any> {
    console.log("📡 Validando EUDR para finca:", fincaId);
    
    const url = `${GEOESPACIAL_BASE}/${fincaId}/validar-eudr`;
    console.log("📡 URL:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
    });

    console.log("📡 Response status:", response.status);

    const data = await response.json();
    console.log("📡 Response data:", data);

    if (!response.ok) {
      console.error("❌ Error en la respuesta:", data);
      throw new Error(data.detail || "Error al validar EUDR");
    }

    console.log("✅ Validación EUDR completada:", data);
    return data;
  }
}