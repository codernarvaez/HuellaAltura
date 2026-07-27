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
  inventario_id: string;
  peso_ingreso_kg: number;
  estado: string;
}

export interface InventarioOut {
  id: string;
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
  inventarioId: string;
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
  proceso_id: string;
}

// ============================================================
// INTERFACES - DESPACHOS
// ============================================================

export interface DespachoCreate {
  inventarioId: string;
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
    productor_id: string;
    finca_id: string;
    finca_nombre: string;
  };
  cumplimiento_eudr: {
    aprobado_cero_deforestacion: boolean;
    fecha_analisis_satelital: string;
  };
  perfil_calidad: {
    clasificacion: string;
    puntaje_sca: number;
    humedad_fisica: number;
  };
  rendimiento_industrial: {
    peso_ingreso_pergamino_kg: number;
    factor_trilla: number;
    peso_oro_exportable_kg: number;
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
  ): Promise<{ mensaje: string; orden_id: string }> {
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
    ordenId: string,
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
    ordenId: string,
    estado: string,
    token?: string
  ): Promise<{ mensaje: string; orden_id: string; estado: string }> {
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
  // 5. BODEGA - CORREGIDO CON QR DESDE MUESTRA
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

  static async getInventarioById(
    inventarioId: string,
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

  static async getInventarioByOrdenCompra(
    ordenCompraId: string,
    token?: string
  ): Promise<InventarioOut | null> {
    console.log('🔍 Obteniendo inventario por orden:', ordenCompraId);
    return this.getInventarioById(ordenCompraId, token);
  }

  /**
   * 🔥 Obtiene el código QR desde una muestra por UUID
   */
  static async getQRFromMuestra(
    muestraId: string,
    token?: string
  ): Promise<string | null> {
    console.log('🔍 Obteniendo QR desde muestra:', muestraId);
    
    try {
      const muestra = await this.getMuestraByUuid(muestraId, token);
      return muestra?.codigoQR || null;
    } catch (error) {
      console.warn(`⚠️ Error obteniendo QR de muestra ${muestraId}:`, error);
      return null;
    }
  }

  /**
   * 🔥 Obtiene el código QR desde una orden (si tiene) o desde su muestra
   */
  static async getQRFromOrden(
    ordenId: string,
    token?: string
  ): Promise<string | null> {
    console.log('🔍 Obteniendo QR desde orden:', ordenId);
    
    try {
      const orden = await this.getOrdenCompraById(ordenId, token);
      
      // Si la orden tiene QR, devolverlo
      if (orden?.codigoQR) {
        console.log('✅ QR encontrado en orden:', orden.codigoQR);
        return orden.codigoQR;
      }
      
      // Si no, buscar en la muestra
      if (orden?.muestraId) {
        console.log(`ℹ️ Buscando QR en muestra ${orden.muestraId}...`);
        return await this.getQRFromMuestra(orden.muestraId, token);
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ Error obteniendo QR de orden ${ordenId}:`, error);
      return null;
    }
  }

  /**
   * 🔥 Enriquecer inventario con código QR desde órdenes o muestras
   */
  static async enriquecerInventarioConQR(
    inventario: InventarioOut[],
    token?: string
  ): Promise<InventarioOut[]> {
    console.log('📦 Enriqueciendo inventario con QR...');
    
    if (inventario.length === 0) {
      return inventario;
    }
    
    try {
      // Obtener todas las órdenes
      const ordenes = await this.getOrdenesCompra(token);
      console.log('📋 Órdenes obtenidas:', ordenes.length);
      
      // Crear mapa de ordenId -> QR
      const mapaQR = new Map();
      
      for (const orden of ordenes) {
        let qr = orden.codigoQR || null;
        
        // Si la orden no tiene QR, buscar en su muestra
        if (!qr && orden.muestraId) {
          try {
            const muestra = await this.getMuestraByUuid(orden.muestraId, token);
            qr = muestra?.codigoQR || null;
            if (qr) {
              console.log(`✅ QR encontrado en muestra ${orden.muestraId}: ${qr}`);
            }
          } catch (e) {
            console.warn(`⚠️ Error obteniendo muestra ${orden.muestraId}:`, e);
          }
        }
        
        mapaQR.set(orden.id, qr || 'N/A');
      }
      
      // Actualizar cada item de inventario con su QR
      const resultado = inventario.map(item => ({
        ...item,
        codigoQR: mapaQR.get(item.ordenCompraId) || item.codigoQR || 'N/A'
      }));
      
      console.log('📦 Inventario enriquecido:', resultado.length, 'items');
      return resultado;
    } catch (error) {
      console.error('❌ Error enriqueciendo inventario con QR:', error);
      return inventario;
    }
  }

  /**
   * Obtiene todos los inventarios con código QR desde las órdenes o muestras
   * GET /acopio/bodega/
   */
  static async getInventarioAll(token?: string): Promise<InventarioOut[]> {
    console.log('📋 Obteniendo todo el inventario');
    
    try {
      const response = await fetch(`${ACOPIO_BASE}/bodega/`, {
        method: "GET",
        headers: authHeaders(token),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Inventario obtenido directamente:', data.length || 0);
        
        if (data.length > 0) {
          console.log('🔍 Item de inventario:', JSON.stringify(data[0], null, 2));
        }
        
        // Si ya tiene QR, devolver directamente
        if (data.length > 0 && data[0].codigoQR) {
          console.log('✅ Inventario ya tiene QR');
          return data;
        }
        
        console.log('ℹ️ Inventario sin QR, enriqueciendo desde órdenes/muestras...');
        return await this.enriquecerInventarioConQR(data, token);
      }
      
      console.log('ℹ️ Endpoint directo falló, usando método alternativo...');
      
      const ordenes = await this.getOrdenesCompra(token);
      console.log('📋 Órdenes para buscar inventario:', ordenes.length);
      
      const inventarios: InventarioOut[] = [];
      for (const orden of ordenes) {
        const inventario = await this.getInventarioByOrdenCompra(orden.id, token);
        if (inventario) {
          let qr = orden.codigoQR || null;
          
          // Si la orden no tiene QR, buscar en la muestra
          if (!qr && orden.muestraId) {
            try {
              const muestra = await this.getMuestraByUuid(orden.muestraId, token);
              qr = muestra?.codigoQR || null;
              console.log(`📝 QR desde muestra ${orden.muestraId}:`, qr);
            } catch (e) {
              console.warn(`⚠️ Error obteniendo muestra ${orden.muestraId}:`, e);
            }
          }
          
          inventarios.push({
            ...inventario,
            ordenCompraId: orden.id,
            codigoQR: qr || 'N/A'
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
    inventarioId: string,
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
    inventarioId: string,
    token?: string
  ): Promise<CertificadoTrazabilidad> {
    console.log('📄 Obteniendo certificado:', inventarioId);
    
    const response = await fetch(`${ACOPIO_BASE}/despachos/certificado/${inventarioId}`, {
      method: "GET",
      headers: authHeaders(token),
    });
    
    const data = await response.json();
    console.log('📡 Response:', data);
    
    if (data.datos_certificado) {
      return data.datos_certificado;
    }
    
    return handleResponse(response, data);
  }

  static async descargarCertificadoPDF(
    inventarioId: string,
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