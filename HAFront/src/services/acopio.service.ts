// src/services/acopio.service.ts
import { API_URL } from "./Api_Base";

const ACOPIO_BASE = `${API_URL}/acopio`;

// ============================================================
// INTERFACES - MUESTRAS
// ============================================================

export interface MuestraCreate {
  fincaId: string;
  productorId: string;
  codigoQR: string;
  tipoProceso: "Lavado" | "Natural" | "Honey";
  peso_lb: number;
  evidenciaFoto?: string;
}

export interface MuestraOut {
  id: string;
  fincaId: string;
  productorId: string;
  codigoQR: string;
  tipoProceso: string;
  pesoKg: number;
  evidenciaFoto?: string;
  creadoEn: string;
  estado?: string;
}

// ============================================================
// INTERFACES - LABORATORIO
// ============================================================

export interface AnalisisFisicoCreate {
  muestraId: string;
  humedad: number;
  criba: string;
  densidad: number;
  defectosPrim: number;
  defectosSec: number;
}

export interface AnalisisFisicoOut {
  id: number;
  muestraId: string;
  humedad: number;
  criba: string;
  densidad: number;
  defectosPrim: number;
  defectosSec: number;
  conforme: boolean;
  noConformidades: string[];
  creadoEn: string;
}

export interface AnalisisSensorialCreate {
  muestraId: string;
  fraganciaAroma: number;
  sabor: number;
  saborResidual: number;
  acidez: number;
  cuerpo: number;
  uniformidad: number;
  balance: number;
  tazaLimpia: number;
  dulzor: number;
  puntajeCatador: number;
  defectos: number;
  nivelTueste: "CLARO" | "MEDIO" | "OSCURO";
}

export interface AnalisisSensorialOut {
  id: number;
  muestraId: string;
  fraganciaAroma: number;
  sabor: number;
  saborResidual: number;
  acidez: number;
  cuerpo: number;
  uniformidad: number;
  balance: number;
  tazaLimpia: number;
  dulzor: number;
  puntajeCatador: number;
  defectos: number;
  puntajeTotal: number;
  nivelTueste: string;
  clasificacion?: string;
  creadoEn: string;
}

// ============================================================
// INTERFACES - ÓRDENES DE COMPRA
// ============================================================

export interface OrdenCompraCreate {
  muestraId: string;
  precioAcordado: number;
  volumenKg: number;
  primas?: number;
}

export interface OrdenCompraOut {
  id: string;
  muestraId: string;
  fincaNombre?: string;
  precioAcordado: number;
  volumenKg: number;
  primas: number;
  aprobadoEUDR: boolean;
  estado: string;
  creadoEn: string;
  codigoQR?: string;
}

// ============================================================
// INTERFACES - BODEGA
// ============================================================

export interface BodegaIngresoCreate {
  ordenCompraId: string;
  codigoQR: string;
  pesoIngresado_lb: number;
  tipoProceso: string;
}

export interface BodegaIngresoOut {
  mensaje: string;
  inventario_id: number;
  peso_ingreso_kg: number;
  estado: string;
}

export interface InventarioOut {
  id: number;
  ordenCompraId: string;
  codigoQR?: string;
  pesoIngresoKg: number;
  pesoSalidaKg: number;
  estado: "EN_BODEGA" | "EN_TRILLA" | "DESPACHADO";
  creadoEn: string;
  actualizadoEn: string;
}

// ============================================================
// INTERFACES - TRILLA
// ============================================================

export interface TrillaCreate {
  inventarioId: number;
  factorRendimiento: number;
}

export interface TrillaOut {
  mensaje: string;
  resultados: {
    peso_entrada_kg: number;
    factor_aplicado: number;
    kg_cafe_oro_esperados: number;
    merma_esperada_kg: number;
  };
  proceso_id: number;
}

// ============================================================
// INTERFACES - DESPACHOS
// ============================================================

export interface DespachoCreate {
  inventarioId: number;
  peso_salida_kg: number;
  destino: string;
}

export interface DespachoOut {
  mensaje: string;
  peso_total_despachado: number;
  saldo_restante_bodega: number;
  estado_lote: string;
  destino: string;
}

// ============================================================
// INTERFACES - CERTIFICADO
// ============================================================

export interface CertificadoTrazabilidad {
  identificador_trazabilidad: string;
  fecha_emision: string;
  origen: {
    productor_id: number;
    finca_id: number;
    finca_nombre: string;
  };
  cumplimiento_eudr: {
    aprobado_cero_deforestacion: boolean;
    fecha_analisis_satelital: string;
  };
  perfil_calidad: {
    clasificacion: string;
    puntaje_sca: number;
    humedad_fisica: string;
  };
  rendimiento_industrial: {
    peso_ingreso_pergamino_kg: number;
    factor_trilla: string | number;
    peso_oro_exportable_kg: string | number;
  };
  estado_despacho: {
    kg_autorizados_salida: number;
    estado_bodega: string;
  };
}

// ============================================================
// UTILIDADES
// ============================================================

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function handleResponse<T>(res: Response, data: any): T {
  if (!res.ok) {
    const errorMsg = data.detail 
      ? (Array.isArray(data.detail) 
          ? data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : data.detail)
      : data.message || `Error ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }
  return data;
}

// ============================================================
// SERVICIO DE ACOPIO
// ============================================================

export class AcopioService {
  
  // ============================================================
  // 1. MUESTRAS
  // ============================================================

  static async registrarMuestra(
    payload: MuestraCreate,
    token?: string
  ): Promise<{ mensaje: string; muestra_id: string }> {
    console.log('📋 Registrando muestra:', payload);
    
    const response = await fetch(`${ACOPIO_BASE}/muestras/`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data);
    return handleResponse(response, data);
  }

  static async getMuestrasByFinca(
    fincaId: string,
    token?: string
  ): Promise<MuestraOut[]> {
    console.log('🔍 Obteniendo muestras para finca UUID:', fincaId);
    
    const response = await fetch(`${ACOPIO_BASE}/muestras/${fincaId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data);
    return handleResponse(response, data);
  }

  static async getMuestraByUuid(
    muestraId: string,
    token?: string
  ): Promise<MuestraOut> {
    console.log('🔍 Obteniendo muestra por UUID:', muestraId);
    
    const response = await fetch(`${ACOPIO_BASE}/muestras/uuid/${muestraId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data);
    return handleResponse(response, data);
  }

  static async getMuestras(
    token?: string
  ): Promise<MuestraOut[]> {
    console.log('🔍 Obteniendo todas las muestras');
    
    const response = await fetch(`${ACOPIO_BASE}/muestras/`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data);
    return handleResponse(response, data);
  }

  // ============================================================
  // 2. LABORATORIO - ANÁLISIS FÍSICO
  // ============================================================

  static async registrarAnalisisFisico(
    payload: AnalisisFisicoCreate,
    token?: string
  ): Promise<AnalisisFisicoOut> {
    console.log('🔬 Registrando análisis físico:', payload);
    
    const response = await fetch(`${ACOPIO_BASE}/laboratorio/fisico`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data);
    return handleResponse(response, data);
  }

  static async getAnalisisFisico(
    muestraId: string,
    token?: string
  ): Promise<AnalisisFisicoOut | null> {
    console.log('🔍 Obteniendo análisis físico para muestra:', muestraId);
    
    try {
      const url = `${ACOPIO_BASE}/laboratorio/fisico/${muestraId}`;
      console.log('📡 GET:', url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: authHeaders(token),
      });
      
      console.log('📡 Status:', response.status);
      
      if (response.status === 404) {
        console.log('ℹ️ Análisis físico no encontrado (404)');
        return null;
      }
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📡 Response:', data);
      return data;
    } catch (error) {
      console.warn('⚠️ Error obteniendo análisis físico:', error);
      return null;
    }
  }

  // ============================================================
  // 3. LABORATORIO - ANÁLISIS SENSORIAL
  // ============================================================

  static async registrarAnalisisSensorial(
    payload: AnalisisSensorialCreate,
    token?: string
  ): Promise<AnalisisSensorialOut> {
    console.log('☕ Registrando análisis sensorial:', payload);
    
    const response = await fetch(`${ACOPIO_BASE}/laboratorio/sensorial`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data);
    return handleResponse(response, data);
  }

  static async getAnalisisSensorial(
    muestraId: string,
    token?: string
  ): Promise<AnalisisSensorialOut | null> {
    console.log('🔍 Obteniendo análisis sensorial para muestra:', muestraId);
    
    try {
      const url = `${ACOPIO_BASE}/laboratorio/sensorial/${muestraId}`;
      console.log('📡 GET:', url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: authHeaders(token),
      });
      
      console.log('📡 Status:', response.status);
      
      if (response.status === 404) {
        console.log('ℹ️ Análisis sensorial no encontrado (404)');
        return null;
      }
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📡 Response:', data);
      return data;
    } catch (error) {
      console.warn('⚠️ Error obteniendo análisis sensorial:', error);
      return null;
    }
  }

  // ============================================================
  // 4. ÓRDENES DE COMPRA
  // ============================================================

  static async aprobarOrdenCompra(
    payload: OrdenCompraCreate,
    token?: string
  ): Promise<{ mensaje: string; orden_id: number }> {
    console.log('🛒 Aprobando orden de compra:', payload);
    
    const response = await fetch(`${ACOPIO_BASE}/compras/aprobar`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  static async getOrdenesCompra(
    token?: string,
    params?: { estado?: string }
  ): Promise<OrdenCompraOut[]> {
    console.log('📋 Obteniendo órdenes de compra:', params);
    
    let url = `${ACOPIO_BASE}/compras/`;
    if (params?.estado) {
      url = `${url}?estado=${params.estado}`;
    }
    
    const response = await fetch(url, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data.length || 0, 'órdenes');
    return handleResponse(response, data);
  }

  static async getOrdenCompraById(
    ordenId: number | string,
    token?: string
  ): Promise<OrdenCompraOut> {
    console.log('🔍 Obteniendo orden de compra:', ordenId);
    
    const response = await fetch(`${ACOPIO_BASE}/compras/${ordenId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  static async getMuestraCompraById(
    muestraId: string,
    token?: string
  ): Promise<MuestraOut> {
    console.log('🔍 Obteniendo muestra desde compras:', muestraId);
    
    const response = await fetch(`${ACOPIO_BASE}/compras/muestra/${muestraId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  static async actualizarEstadoOrden(
    ordenId: number | string,
    estado: string,
    token?: string
  ): Promise<{ mensaje: string; orden_id: number; estado: string }> {
    console.log('📝 Actualizando estado de orden:', ordenId, '->', estado);
    
    const response = await fetch(`${ACOPIO_BASE}/compras/${ordenId}/estado`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ estado }),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  // ============================================================
  // 5. BODEGA
  // ============================================================

  static async registrarIngresoBodega(
    payload: BodegaIngresoCreate,
    token?: string
  ): Promise<BodegaIngresoOut> {
    console.log('📦 Registrando ingreso a bodega:', payload);
    
    const response = await fetch(`${ACOPIO_BASE}/bodega/ingreso`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  /**
   * Obtiene un inventario por ID
   * GET /acopio/bodega/{inventarioId}
   */
  static async getInventarioById(
    inventarioId: number | string,
    token?: string
  ): Promise<InventarioOut | null> {
    console.log('🔍 Obteniendo inventario por ID:', inventarioId);
    
    try {
      const response = await fetch(`${ACOPIO_BASE}/bodega/${inventarioId}`, {
        method: "GET",
        headers: authHeaders(token),
      });
      
      if (response.status === 404) {
        console.log('ℹ️ Inventario no encontrado (404)');
        return null;
      }
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📡 Response:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getInventarioById:', error);
      return null;
    }
  }

  /**
   * Obtiene el inventario asociado a una orden de compra
   */
  static async getInventarioByOrdenCompra(
    ordenCompraId: string,
    token?: string
  ): Promise<InventarioOut | null> {
    console.log('🔍 Obteniendo inventario por orden:', ordenCompraId);
    return this.getInventarioById(ordenCompraId, token);
  }

  /**
   * 🔥 NUEVO: Obtiene todos los inventarios (recorriendo órdenes)
   * GET /acopio/bodega/
   */
  static async getInventarioAll(token?: string): Promise<InventarioOut[]> {
    console.log('📋 Obteniendo todo el inventario');
    
    try {
      // Primero intentamos obtener directamente de /acopio/bodega/
      const response = await fetch(`${ACOPIO_BASE}/bodega/`, {
        method: "GET",
        headers: authHeaders(token),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Inventario obtenido directamente:', data.length || 0);
        return data;
      }
      
      // Si el endpoint directo falla, intentamos con el método alternativo
      console.log('ℹ️ Endpoint directo falló, usando método alternativo...');
      
      const ordenes = await this.getOrdenesCompra(token);
      console.log('📋 Órdenes para buscar inventario:', ordenes.length);
      
      const inventarios: InventarioOut[] = [];
      for (const orden of ordenes) {
        const inventario = await this.getInventarioByOrdenCompra(orden.id, token);
        if (inventario) {
          inventarios.push({
            ...inventario,
            ordenCompraId: orden.id,
            codigoQR: orden.codigoQR || 'N/A'
          });
        }
      }
      
      console.log('📦 Inventarios encontrados:', inventarios.length);
      return inventarios;
    } catch (error) {
      console.error('❌ Error en getInventarioAll:', error);
      return [];
    }
  }

  // ============================================================
  // 6. TRILLA
  // ============================================================

  static async procesarTrilla(
    payload: TrillaCreate,
    token?: string
  ): Promise<TrillaOut> {
    console.log('⚙️ Procesando trilla:', payload);
    
    const response = await fetch(`${ACOPIO_BASE}/trilla/procesar`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  static async getHistorialTrilla(
    inventarioId: number,
    token?: string
  ): Promise<any[]> {
    console.log('🔍 Obteniendo historial de trilla:', inventarioId);
    
    const response = await fetch(`${ACOPIO_BASE}/trilla/historial/${inventarioId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  // ============================================================
  // 7. DESPACHOS
  // ============================================================

  static async registrarDespacho(
    payload: DespachoCreate,
    token?: string
  ): Promise<DespachoOut> {
    console.log('🚢 Registrando despacho:', payload);
    
    const response = await fetch(`${ACOPIO_BASE}/despachos/registrar`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  static async getDespachos(
    token?: string
  ): Promise<any[]> {
    console.log('📋 Obteniendo despachos');
    
    const response = await fetch(`${ACOPIO_BASE}/despachos/`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  // ============================================================
  // 8. CERTIFICADOS
  // ============================================================

  static async getCertificadoTrazabilidad(
    inventarioId: number,
    token?: string
  ): Promise<CertificadoTrazabilidad> {
    console.log('📄 Obteniendo certificado:', inventarioId);
    
    const response = await fetch(`${ACOPIO_BASE}/despachos/certificado/${inventarioId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  static async descargarCertificadoPDF(
    inventarioId: number,
    token?: string
  ): Promise<Blob> {
    console.log('📄 Descargando certificado PDF:', inventarioId);
    
    const response = await fetch(`${ACOPIO_BASE}/despachos/certificado/${inventarioId}/pdf`, {
      method: "GET",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || `Error ${response.status}: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // ============================================================
  // 9. ESTADÍSTICAS Y REPORTES
  // ============================================================

  static async getEstadisticas(
    token?: string
  ): Promise<any> {
    console.log('📊 Obteniendo estadísticas');
    
    const response = await fetch(`${ACOPIO_BASE}/estadisticas`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  static async getResumenFinca(
    fincaId: string,
    token?: string
  ): Promise<any> {
    console.log('📊 Obteniendo resumen de finca:', fincaId);
    
    const response = await fetch(`${ACOPIO_BASE}/estadisticas/finca/${fincaId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  // ============================================================
  // 10. CÓDIGOS QR
  // ============================================================

  static async generarQR(
    muestraId: string,
    token?: string
  ): Promise<{ mensaje: string; codigoQR: string; url: string }> {
    console.log('🏷️ Generando QR para muestra:', muestraId);
    
    const response = await fetch(`${ACOPIO_BASE}/muestras/${muestraId}/generar-qr`, {
      method: "POST",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }

  static async validarQR(
    codigoQR: string,
    token?: string
  ): Promise<{ valido: boolean; muestra?: MuestraOut }> {
    console.log('🔍 Validando QR:', codigoQR);
    
    const response = await fetch(`${ACOPIO_BASE}/muestras/validar-qr/${codigoQR}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    return handleResponse(response, data);
  }
}

export const acopioService = AcopioService;