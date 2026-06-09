# Estructura de Hitos (Milestones) para GitHub Projects
## Proyecto: Plataforma Global de Trazabilidad y cumplimiento EUDR (Módulo 1)

Este documento sirve como guía para la configuración del espacio de trabajo en GitHub Projects. Divide el desarrollo del Módulo 1 (Productor, Finca y Certificación) en 5 hitos secuenciales y lógicos.

---

## 🗺️ Visión General del Road-map (Hitos)

- **Hito 1:** Cimiento Multi-Tenant y Formularios dinámicos (Semanas 1)
- **Hito 2:** Aplicación Móvil Offline-First y Flujo de Sincronización (Semanas 1)
- **Hito 3:** Geolocalización Geodésica y Validación de Polígonos (Semanas 2-3)
- **Hito 4:** Integración Satelital Automatizada con Google Earth Engine (Semanas 2-3)
- **Hito 5:** Certificados de Debido Cumplimiento (DDS) e Integración TRACES (Semanas 4-5)

---

## 🛠️ Desglose Detallado de Hitos (Milestones)

### Hito 1: Cimiento Multi-Tenant y Motor de Formularios Dinámicos
* **Objetivo de Negocio:** Permitir que diferentes asociaciones/clientes (tenants) creen sus cuentas y diseñen qué variables adicionales de la ficha del productor (carbono, biodiversidad) van a recopilar de forma aislada y segura.
* **Requisitos IEEE 830 asociados:** RF-WEB-001, RF-WEB-002, RS-SEC-002.

#### 📋 Backlog de Issues (Tareas) para este Hito:
1. **[Feature]** Configurar Base de Datos con aislamiento lógico multitenant (esquema dinámico para datos custom).
2. **[Feature]** Diseñar e implementar el Middleware de enrutamiento API para identificar `tenant_id` mediante JSON Web Tokens (JWT).
3. **[Feature]** Desarrollar el constructor de formularios dinámicos en el panel Web de administración (Drag and Drop para agregar variables de biodiversidad/carbono).
4. **[UI/UX]** Panel web de visualización y edición del esquema dinámico del cliente (JSON Schema).
5. **[Task]** Pruebas de integración de fuga de datos cruzada entre dos inquilinos de prueba (`APECAEL` y `SOJA_AGRO`).

* **Definición de Terminado (DoD):** Un administrador puede iniciar sesión en su organización, agregar una nueva variable de tipo número llamada `biomasa_aerea`, y ver que esta variable se refleja únicamente en la estructura de datos de su organización.

---

### Hito 2: Aplicación Móvil Offline-First y Flujo de Sincronización
* **Objetivo de Negocio:** Permitir que los técnicos de campo recolecten la información de los productores y sus fincas en zonas rurales sin conexión a internet, garantizando que no se pierda información.
* **Requisitos IEEE 830 asociados:** RF-MOB-001, RF-MOB-003, RF-MOB-004, RS-SEC-004.

#### 📋 Backlog de Issues (Tareas) para este Hito:
1. **[Feature]** Configurar base de datos local cifrada (SQLCipher) en la app móvil.
2. **[Feature]** Desarrollar la lógica de sincronización bidireccional (detección de estado de red, colas de peticiones y reintentos automáticos).
3. **[UI/UX]** Diseñar pantalla táctil adaptativa en móvil para el formulario del Módulo 1 (Core + variables dinámicas descargadas del tenant).
4. **[Feature]** Integrar módulo de cámara nativa para escaneo de documentos de identidad/escrituras de tierra y procesamiento local liviano (OCR).
5. **[Feature]** Desarrollar el panel de captura de firma táctil y registrar metadatos de integridad (GPS y hora UTC en la firma).

* **Definición de Terminado (DoD):** El técnico de campo puede registrar un productor completo y guardar fotos de su escritura con el celular en "Modo Avión". Al desactivar el "Modo Avión", el registro debe enviarse automáticamente a la base de datos en la nube sin duplicados.

---

### Hito 3: Geolocalización Geodésica y Validación de Polígonos
* **Objetivo de Negocio:** Levantar con precisión los linderos de las fincas y validar si cumplen con los criterios geométricos obligatorios de la UE (puntos para predios < 4ha, polígonos cerrados para predios >= 4ha).
* **Requisitos IEEE 830 asociados:** RF-MOB-002, RNF-USA-001, RNF-USA-002.

#### 📋 Backlog de Issues (Tareas) para este Hito:
1. **[Feature]** Integrar API de mapas offline en el dispositivo móvil utilizando capas satelitales cacheadas.
2. **[Feature]** Desarrollar algoritmo móvil de trazado de polígonos mediante caminata GPS de linderos (tracking con filtro de precisión de hardware +- 5 metros).
3. **[Feature]** Programar las reglas de validación geodésica del polígono (cierre de vértices, cálculo de área en hectáreas y verificación de auto-intersección de linderos).
4. **[UI/UX]** Crear alerta visual interactiva de advertencia de área (si el área es >= 4 hectáreas, obligar al usuario a completar el polígono en lugar de un punto único).

* **Definición de Terminado (DoD):** Un técnico puede caminar el lindero de la finca "El Ahuacate", y la app calcula que tiene 3.0 hectáreas, genera un GeoJSON válido y bloquea el envío si el usuario intenta guardar un polígono que se cruza a sí mismo.

---

### Hito 4: Integración Satelital Automatizada (Google Earth Engine API)
* **Objetivo de Negocio:** Cruzar los datos del polígono capturado en el Hito 3 con el historial satelital de Copernicus (Sentinel-2) mediante las APIs de Google para certificar de forma inalterable que no hubo deforestación desde el 31/12/2020.
* **Requisitos IEEE 830 asociados:** RF-WEB-003, RNF-PER-002.

#### 📋 Backlog de Issues (Tareas) para este Hito:
1. **[Feature]** Configurar la cuenta de servicio de Google Cloud Platform y acceso comercial a Google Earth Engine.
2. **[Feature]** Desarrollar el Script de Python/Node para la API de GEE que reciba un polígono/punto, consulte las series temporales de Copernicus desde el 31-Dic-2020 y calcule anomalías de NDVI.
3. **[Feature]** Implementar el algoritmo de reintento exponencial (exponential backoff) para llamadas de API de GEE fallidas de acuerdo con la norma IEEE 830.
4. **[UI/UX]** Diseñar el "Radar/Semáforo" de estatus satelital en el dashboard web de administración (Verde: Aprobado / Rojo: Deforestación Detectada).

* **Definición de Terminado (DoD):** Al hacer clic en "Ejecutar Auditoría GEE", el sistema envía el polígono a Google, procesa el análisis temporal satelital y actualiza el estado de la finca a "Aprobado" o "Rechazado" en menos de 8 segundos.

---

### Hito 5: Certificados de Debido Cumplimiento (DDS) e Integración con TRACES (UE)
* **Objetivo de Negocio:** Emitir el documento final verificable y firmado criptográficamente de cumplimiento.
* **Requisitos IEEE 830 asociados:** RF-WEB-004, RS-SEC-003, RS-SEC-005.

#### 📋 Backlog de Issues (Tareas) para este Hito:
1. **[Feature]** Programar generador de PDF para el certificado DDS con estilos limpios de impresión (ocultando barras de navegación web).
2. **[Feature]** Implementar firma digital criptográfica de documentos (cifrado SHA-256) combinando datos de finca + estatus de GEE para evitar fraudes de datos.
3. **[Feature]** Desarrollar el módulo de generación de código QR dinámico de validación pública para autoridades aduaneras.
4. **[Feature]** Diseñar la pasarela de exportación JSON/XML compatible con el formato oficial del sistema de información TRACES de la Unión Europea.

* **Definición de Terminado (DoD):** Al consultar una finca "Aprobada", se genera una opcion para que se proceda con el trámite de certificado imprimible y un archivo JSON exportable que contiene toda la cadena de custodia cifrada y el código QR redirige al mapa de linderos.
