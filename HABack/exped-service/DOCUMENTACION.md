# GeoGuard EUDR — Documentación Técnica del Backend

**Módulo:** Backend de Gestión de Expedientes EUDR  
**Autor:** Kevin Sarango  
**Versión:** 2.1.0  
**Stack:** FastAPI · Prisma (PostgreSQL/Neon) · JWT HS256 · bcrypt  
**Deployado en:** https://geoguard-exped.onrender.com  

## Documentación Interactiva

- **Swagger UI:** https://geoguard-exped.onrender.com/docs
- **ReDoc:** https://geoguard-exped.onrender.com/redoc

---

## 🏗️ Arquitectura de Datos y Relaciones

El sistema se basa en una jerarquía de entidades que fluyen desde la creación del expediente hasta la certificación final.

### 1. Flujo de Identificadores (ID Flow)
Para operar correctamente con la API, sigue este orden de jerarquía:

1.  **Expediente (`expediente_id`)**: Creado mediante `POST /expedientes/`. 
    - Al crearse, genera un `eudr_id` (Identificador EUDR).
    - El `expediente_id` es el ancla para todo lo demás.
2.  **Dato Agroambiental (`dato_id`)**: Asociado a un `expediente_id`. 
    - Se crea vía `POST /agroambiental/{expediente_id}`.
    - Contiene métricas de biodiversidad y stock de carbono.
3.  **Variable Dinámica (`variable_id`)**: Asociada a un `dato_id`.
    - Se crea vía `POST /variables/{dato_id}`.
    - Permite agregar campos personalizados sin cambiar el esquema.

### 2. Ciclo de Certificación
Un expediente debe cumplir con un proceso de validación antes de obtener su certificado:

1.  **Registro**: Se crea el expediente y se cargan sus datos técnicos.
2.  **Auditoría GEE**: Se ejecuta un análisis satelital (`POST /auditoria/`).
    - Si el resultado es **APROBADO**, el estado del expediente cambia a `APROBADO`.
3.  **Certificación**: Solo los expedientes con una auditoría aprobada pueden generar un certificado DDS (`POST /certificados/`).

---

## 🛠️ Tecnologías Utilizadas

- **Framework:** FastAPI (Python)
- **ORM:** Prisma Client Python
- **Base de Datos:** PostgreSQL
- **Documentación:** OpenAPI (Swagger/Redoc)
- **Autenticación:** Integración con `auth-service` vía JWT y Roles.

## 1. Descripción General

El sistema se integra con un módulo externo de autenticación (`auth-service`) mediante tokens JWT. La validación del token es **local** (sin llamadas HTTP por petición), usando una clave secreta compartida (HS256).

---

## 2. Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Cliente (Frontend)                   │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP + Bearer JWT
┌───────────────────────▼─────────────────────────────────┐
│              FastAPI — GeoGuard EUDR API                │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │Expedientes│ │Auditoria │ │Certific. │ │Usuarios   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │Agroamb.  │ │Productores│ │Fincas    │                 │
│  └──────────┘ └──────────┘ └──────────┘                 │
│  ┌──────────┐                                            │
│  │ Variables │                                            │
│  │ Dinámicas│                                            │
│  └──────────┘                                            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  security.py — JWT local (HS256) + RBAC         │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Prisma ORM (sync) — PostgreSQL (Neon)          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  auth-service (externo) — emite tokens JWT HS256        │
│  https://huellaaltura.onrender.com                       │
└─────────────────────────────────────────────────────────┘
```

**Decisiones de diseño clave:**
- ORM: **Prisma** (sync interface) en lugar de SQLAlchemy — genera el cliente Python desde `schema.prisma`.
- BD: **PostgreSQL en Neon** (serverless) — soporta nativamente transacciones, cascadas y relaciones complejas.
- Auth: validación **local** del JWT — la aplicación no llama al `auth-service` en cada petición, solo verifica la firma con la `SECRET_KEY` compartida.
- Deployment: **Render** (PaaS) — auto-redeploy en cada push a main, prisma db push en build.

---

## 3. Estructura del Proyecto

```
backend-kevin-sarango/
│
├── app/
│   ├── __init__.py
│   ├── main.py              # Punto de entrada, registro de routers, CORS, lifespan
│   ├── database.py          # Instancia global de Prisma
│   ├── security.py          # Validación JWT y factory RBAC require_roles()
│   │
│   ├── models/
│   │   └── models.py        # Enums de Python (sin SQLAlchemy)
│   │
│   ├── schemas/
│   │   └── schemas.py       # Modelos Pydantic (request/response)
│   │
│   └── routers/
│       ├── expedientes.py   # CRUD expedientes + historial trazabilidad
│       ├── agroambiental.py # CRUD datos agroambientales + resumen carbono
│       ├── usuarios.py      # CRUD usuarios (solo ADMIN)
│       ├── roles.py         # CRUD roles
│       ├── fincas.py        # CRUD fincas
│       ├── auditoria.py     # Registro auditorías GEE
│       └── certificados.py  # Emisión y revocación certificados DDS
│
├── schema.prisma            # Definición de modelos de base de datos
├── init_db.py               # Script para generar cliente Prisma y aplicar schema
├── requirements.txt         # Dependencias Python
├── test_api.py              # Suite de validaciones automatizadas (42 tests)
├── .env                     # Variables de entorno (NO subir a git)
└── .env.example             # Plantilla de variables de entorno
```

---

## 4. Modelos de Datos

El schema completo está definido en `schema.prisma`. Arquitectura: **Productor → Finca → Expediente**.

### Finca → tabla `fincas`
Propiedad agrícola vinculada a un Usuario de auth-service con rol PRODUCTOR.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (UUID) | Clave primaria |
| `nombre` | String | Nombre de la finca |
| `eudr_id` | String (único) | Código EUDR generado (`uuidv4-XXXXXXXX-XXXXX`) |
| `usuario_id` | String | FK a Usuario (auth-service) |
| `provincia` | String? | Provincia |
| `canton` | String? | Cantón |
| `parroquia` | String? | Parroquia |
| `area_total_ha` | Float? | Área total (hectáreas) |
| `area_cultivada_ha` | Float? | Área cultivada (hectáreas) |
| `tenencia` | String? | `PROPIA` / `POSESION` / `ARRENDAMIENTO` |
| `latitud` | Float? | Coordenada |
| `longitud` | Float? | Coordenada |
| `creado_en` | DateTime | Fecha de creación |

**Relaciones:** tiene muchos `Expediente` (cascade delete).

---

### Expediente → tabla `expedientes`
Solicitud de cumplimiento EUDR para una Finca.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (UUID) | Clave primaria |
| `finca_id` | String | FK a `fincas` |
| `estado` | String | `PENDIENTE` / `EN_PROCESO` / `APROBADO` / `RECHAZADO` |
| `organizacion_inquilino` | String? | Inquilino (multi-tenant) |
| `creado_en` | DateTime | Fecha de creación (automático) |
| `actualizado_en` | DateTime | Última actualización (automático) |

**Relaciones:** vinculada a `Finca`, tiene muchos `Dato`, `Historial`, `Auditoria`, `Certificado` (cascade delete).

---

### Dato → tabla `datos_agroambientales`
Indicadores de biodiversidad y carbono asociados a un expediente.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (UUID) | Clave primaria |
| `expediente_id` | String | FK a `expedientes` |
| `indice_shannon` | Float? | Índice de diversidad Shannon |
| `indice_simpson` | Float? | Índice de diversidad Simpson |
| `uso_suelo` | String? | Descripción del uso del suelo |
| `cobertura_forestal` | String? | Tipo de cobertura forestal |
| `sistema_produccion` | String? | Sistema de producción agrícola |
| `biomasa_arboles` | Float? | Biomasa de árboles (tC/ha) |
| `biomasa_cafe` | Float? | Biomasa de café (tC/ha) |
| `hojarasca_mantillo` | Float? | Hojarasca y mantillo (tC/ha) |
| `carbono_organico_suelo` | Float? | Carbono orgánico del suelo (tC/ha) |
| `total_stock_carbono` | Float? | Stock total de carbono (tC/ha) |
| `creado_en` | DateTime | Fecha de creación (automático) |

---

### Historial → tabla `historial_trazabilidad`
Registro automático de todos los eventos del expediente.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (UUID) | Clave primaria |
| `expediente_id` | String | FK a `expedientes` |
| `accion` | String | Descripción corta del evento |
| `descripcion` | String? | Detalle del evento |
| `usuario` | String? | `sub` del token JWT que realizó la acción |
| `fecha` | DateTime | Fecha del evento (automático) |

---

### Rol → tabla `roles`
Roles del sistema para RBAC.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (UUID) | Clave primaria |
| `nombre` | String (único) | Ver tabla de roles abajo |
| `descripcion` | String? | Descripción del rol |

**Roles disponibles:**

| Rol | Descripción |
|---|---|
| `SUPER_ADMIN` | Administrador global del sistema — acceso total |
| `TENANT_ADMIN` | Administrador de organización/inquilino — gestiona su propio entorno |
| `CLIENTE` | Usuario final — solo lectura |
| `TECNICO_CAMPO` | Operario que registra expedientes y datos agroambientales en campo |
| `AUDITOR_INTERNO` | Analista que ejecuta y revisa auditorías GEE y genera certificados |
| `AUDITOR_EXTERNO` | Autoridad europea / organismo regulador — solo lectura de auditorías |

---

### Usuario → tabla `usuarios`
Usuarios del sistema gestionados por el ADMIN.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (UUID) | Clave primaria |
| `nombre` | String | Nombre completo |
| `email` | String (único) | Correo electrónico |
| `password_hash` | String | Contraseña hasheada con bcrypt |
| `rol_id` | String? | FK a `roles` |
| `activo` | Boolean | `true` por defecto; `false` = desactivado (soft delete) |
| `creado_en` | DateTime | Fecha de creación (automático) |

---

### Finca → tabla `fincas`
Información geoespacial de fincas, opcionalmente vinculadas a un productor.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (UUID) | Clave primaria |
| `nombre` | String | Nombre de la finca |
| `eudr_id` | String? (único) | Código EUDR |
| `provincia` | String? | Provincia |
| `canton` | String? | Cantón |
| `parroquia` | String? | Parroquia |
| `area_total_ha` | Float? | Área total |
| `area_cultivada_ha` | Float? | Área cultivada |
| `tenencia` | String? | `PROPIA` / `POSESION` / `ARRENDAMIENTO` |
| `latitud` | Float? | Latitud |
| `longitud` | Float? | Longitud |
| `productor_id` | String? | FK a `usuarios` |
| `creado_en` | DateTime | Fecha de creación |

---

### Auditoria → tabla `auditorias_gee`
Resultados de auditorías satelitales de deforestación (Google Earth Engine).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (UUID) | Clave primaria |
| `expediente_id` | String | FK a `expedientes` |
| `fecha_auditoria` | DateTime | Fecha de la auditoría (automático) |
| `resultado` | String | `APROBADO` / `RECHAZADO` |
| `deforestacion_detectada` | Boolean | Si se detectó deforestación |
| `fecha_corte` | DateTime? | Fecha de corte del análisis |
| `fuente` | String? | Fuente del análisis (default: `Google Earth Engine`) |
| `observaciones` | String? | Observaciones adicionales |
| `ejecutado_por` | String? | `sub` del token JWT del auditor |

**Efecto secundario:** al crear una auditoría, el estado del expediente se actualiza automáticamente a `APROBADO` o `RECHAZADO`.

---

### Certificado → tabla `certificados_dds`
Certificados de Due Diligence Statement (DDS) para exportación.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (UUID) | Clave primaria |
| `expediente_id` | String | FK a `expedientes` |
| `codigo_certificado` | String (único) | Código generado: `DDS-{año}-{8 chars hex}` |
| `fecha_emision` | DateTime | Fecha de emisión (automático) |
| `fecha_vencimiento` | DateTime? | Fecha de vencimiento |
| `estado` | String | `VIGENTE` / `VENCIDO` / `REVOCADO` |
| `generado_por` | String? | `sub` del token JWT del generador |
| `url_documento` | String? | URL del documento PDF |

**Requisito previo:** el expediente debe tener al menos una auditoría GEE con `resultado = APROBADO`.

---

## 5. Autenticación y Autorización

### Flujo de autenticación

```
1. El usuario se autentica en auth-service (externo)
2. auth-service emite un JWT firmado con SECRET_KEY compartida (HS256)
3. El cliente envía el JWT en el header: Authorization: Bearer <token>
4. Este backend valida la firma localmente (sin llamadas HTTP)
5. Se extrae el payload: { sub, role, exp }
```

### Estructura del JWT

```json
{
  "sub": "usuario@ejemplo.com",
  "role": "ADMIN",
  "exp": 1700000000
}
```

| Campo | Descripción |
|---|---|
| `sub` | Identificador del usuario (email) |
| `role` | Rol del usuario: `ADMIN`, `AUDITOR` o `CLIENTE` |
| `exp` | Timestamp de expiración |

### Implementación (`app/security.py`)

**`get_current_user`** — verifica el token y retorna el payload:
```python
def get_current_user(credentials = Depends(HTTPBearer())) -> dict:
    # Lanza HTTP 401 si el token es inválido o expirado
```

**`require_roles(*roles)`** — factory de dependencias para RBAC:
```python
def require_roles(*allowed: str):
    # Lanza HTTP 403 si el rol del token no está en la lista
```

### Tabla de permisos por endpoint

| Recurso | GET (listar/leer) | POST (crear) | PATCH/PUT | DELETE / Revocar |
|---|---|---|---|---|
| Expedientes | Cualquier token | SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO | SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO | SUPER_ADMIN, TENANT_ADMIN |
| Agroambiental | Cualquier token | SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO | SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO | — |
| Usuarios | SUPER_ADMIN, TENANT_ADMIN | SUPER_ADMIN, TENANT_ADMIN | SUPER_ADMIN, TENANT_ADMIN | SUPER_ADMIN, TENANT_ADMIN |
| Roles | Cualquier token | SUPER_ADMIN | — | SUPER_ADMIN |
| Fincas | Cualquier token | Cualquier token | SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO | SUPER_ADMIN, TENANT_ADMIN |
| Auditoría GEE | SUPER_ADMIN, TENANT_ADMIN, AUDITOR_INTERNO, AUDITOR_EXTERNO* | SUPER_ADMIN, TENANT_ADMIN, AUDITOR_INTERNO | — | — |
| Certificados DDS | SUPER_ADMIN, TENANT_ADMIN, AUDITOR_INTERNO, AUDITOR_EXTERNO* | SUPER_ADMIN, TENANT_ADMIN, AUDITOR_INTERNO | — | SUPER_ADMIN, TENANT_ADMIN |

> *GET por ID o por expediente está abierto a cualquier token autenticado.

---

## 6. Endpoints de la API

**Base URL:** `http://localhost:8000/api/v1`  
**Documentación interactiva:** `http://localhost:8000/docs`

> Todos los endpoints requieren header `Authorization: Bearer <token>`. Los códigos de error comunes a **todos los endpoints** son:
>
> | Código | Causa |
> |---|---|
> | `401 Unauthorized` | Token ausente, mal formado o expirado |
> | `403 Forbidden` | Token válido pero el rol no tiene permiso |
> | `422 Unprocessable Entity` | Error de validación Pydantic (campo requerido faltante, valor de enum inválido, tipo incorrecto) |
> | `500 Internal Server Error` | Error interno no controlado del servidor |

---

### 6.1 Expedientes

**Prefijo:** `/api/v1/expedientes`

#### `GET /`
Lista todos los expedientes. Soporta filtros por query params.

**Auth:** cualquier token autenticado  
**Query params opcionales:**
- `estado` — filtra por estado (`PENDIENTE`, `APROBADO`, etc.)
- `organizacion` — filtra por `organizacion_inquilino`

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de expedientes (puede ser vacía `[]`) |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `422 Unprocessable Entity` | Query param con valor inválido |
| `500 Internal Server Error` | Error de conexión con la base de datos |

**Respuesta 200:**
```json
[
  {
    "id": "uuid",
    "eudr_id": "uuidv4-2A43E5A5-3EC5C",
    "nombre_completo": "José Mosquera",
    "nombre_finca": "El Ahuacate",
    "estado": "PENDIENTE",
    "historial": [...],
    "datos_agroambientales": [...]
  }
]
```

---

#### `POST /`
Crea un nuevo expediente. Genera `eudr_id` automáticamente y registra el primer evento en el historial.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO

**Body:**
```json
{
  "nombre_completo": "José Mosquera",
  "cedula_id": "1100433455",
  "nombre_finca": "El Ahuacate",
  "provincia": "Loja",
  "canton": "Loja",
  "latitud": -4.2625,
  "longitud": -79.2231,
  "genero": "MASCULINO",
  "tenencia": "PROPIA",
  "area_total_ha": 3.0,
  "datos_agroambientales": {
    "indice_shannon": 2.5,
    "total_stock_carbono": 45.3
  }
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `201 Created` | Expediente creado exitosamente con historial y datos incluidos |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (ej: CLIENTE, AUDITOR_EXTERNO) |
| `422 Unprocessable Entity` | `nombre_completo`, `cedula_id` o `nombre_finca` faltantes; `genero` o `tenencia` con valor inválido |
| `500 Internal Server Error` | Error al crear el registro en la base de datos |

---

#### `GET /eudr/{eudr_id}`
Busca un expediente por su código EUDR.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Expediente encontrado |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | No existe expediente con ese `eudr_id` |
| `500 Internal Server Error` | Error interno |

---

#### `GET /{expediente_id}`
Obtiene un expediente por UUID.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Expediente encontrado con historial y datos agroambientales |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | No existe expediente con ese UUID |
| `500 Internal Server Error` | Error interno |

---

#### `PATCH /{expediente_id}`
Actualiza campos del expediente y registra el cambio en el historial.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO

**Body (campos opcionales):**
```json
{
  "estado": "EN_PROCESO",
  "nombre_finca": "Nueva Finca",
  "area_total_ha": 5.0,
  "latitud": -4.3,
  "longitud": -79.5
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Expediente actualizado, historial registrado |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (ej: CLIENTE, AUDITOR_INTERNO) |
| `404 Not Found` | No existe expediente con ese UUID |
| `422 Unprocessable Entity` | Valor de `estado` fuera del enum permitido |
| `500 Internal Server Error` | Error al actualizar |

---

#### `DELETE /{expediente_id}`
Elimina un expediente y todos sus registros relacionados (cascade).

**Auth:** SUPER_ADMIN, TENANT_ADMIN

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | `{"message": "Expediente eliminado"}` |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (solo SUPER_ADMIN y TENANT_ADMIN) |
| `404 Not Found` | No existe expediente con ese UUID |
| `500 Internal Server Error` | Error al eliminar (ej: constraints FK) |

---

#### `GET /{expediente_id}/historial`
Lista el historial de trazabilidad de un expediente.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de eventos ordenados cronológicamente |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | Expediente no encontrado |
| `500 Internal Server Error` | Error interno |

---

#### `POST /{expediente_id}/historial`
Agrega un evento manual al historial.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO

**Body:**
```json
{
  "accion": "Visita de campo",
  "descripcion": "Se verificó la finca in situ"
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `201 Created` | Evento registrado en el historial |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso |
| `404 Not Found` | Expediente no encontrado |
| `422 Unprocessable Entity` | Campo `accion` faltante |
| `500 Internal Server Error` | Error al crear el evento |

---

### 6.2 Datos Agroambientales

**Prefijo:** `/api/v1/agroambiental`

#### `GET /{expediente_id}`
Lista los datos agroambientales de un expediente.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de registros agroambientales (puede ser vacía) |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | Expediente no encontrado |
| `500 Internal Server Error` | Error interno |

---

#### `POST /{expediente_id}`
Agrega un nuevo registro de datos agroambientales. Registra automáticamente un evento en el historial.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO

**Body:**
```json
{
  "indice_shannon": 2.1,
  "indice_simpson": 0.85,
  "uso_suelo": "Agroforestal",
  "cobertura_forestal": "Bosque nativo",
  "biomasa_arboles": 120.5,
  "biomasa_cafe": 8.3,
  "total_stock_carbono": 38.5
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `201 Created` | Datos registrados y evento en historial creado |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (ej: CLIENTE, AUDITOR_EXTERNO) |
| `404 Not Found` | Expediente no encontrado |
| `422 Unprocessable Entity` | Tipo de dato incorrecto (ej: string en campo Float) |
| `500 Internal Server Error` | Error al persistir los datos |

---

#### `PUT /{expediente_id}/{dato_id}`
Actualiza un registro de datos agroambientales existente.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Datos actualizados |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso |
| `404 Not Found` | Dato agroambiental no encontrado para ese expediente |
| `422 Unprocessable Entity` | Tipo de dato incorrecto |
| `500 Internal Server Error` | Error al actualizar |

---

#### `GET /resumen/carbono`
Resumen consolidado del stock de carbono por finca.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, AUDITOR_INTERNO, AUDITOR_EXTERNO

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista con nombre_finca, eudr_id y total_stock_carbono_tC_ha |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (ej: CLIENTE, TECNICO_CAMPO) |
| `500 Internal Server Error` | Error al consultar los datos |

**Respuesta 200:**
```json
[
  {
    "nombre_finca": "El Ahuacate",
    "eudr_id": "uuidv4-2A43E5A5-3EC5C",
    "total_stock_carbono_tC_ha": 45.3
  }
]
```

---

### 6.3 Usuarios

**Prefijo:** `/api/v1/usuarios`  
**Todos los endpoints requieren rol SUPER_ADMIN o TENANT_ADMIN.**

#### `GET /`
Lista todos los usuarios del sistema.

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de usuarios sin `password_hash` |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso |
| `500 Internal Server Error` | Error interno |

---

#### `POST /`
Crea un nuevo usuario. La contraseña se hashea con bcrypt antes de almacenarse.

**Body:**
```json
{
  "nombre": "Ana Auditora",
  "email": "ana@geoguard.ec",
  "password": "MiPassword123!",
  "rol_id": "uuid-del-rol"
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `201 Created` | Usuario creado con `activo = true` |
| `400 Bad Request` | El email ya está registrado en el sistema |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso |
| `422 Unprocessable Entity` | `nombre`, `email` o `password` faltantes |
| `500 Internal Server Error` | Error al crear el usuario |

---

#### `GET /{usuario_id}`
Obtiene un usuario por ID.

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Datos del usuario sin `password_hash` |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso |
| `404 Not Found` | Usuario no encontrado |
| `500 Internal Server Error` | Error interno |

---

#### `PATCH /{usuario_id}`
Actualiza el rol o estado activo de un usuario.

**Body:**
```json
{
  "rol_id": "nuevo-uuid-rol",
  "activo": true
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Usuario actualizado |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso |
| `404 Not Found` | Usuario no encontrado |
| `422 Unprocessable Entity` | Tipo de dato incorrecto en `activo` |
| `500 Internal Server Error` | Error al actualizar |

---

#### `DELETE /{usuario_id}`
**Soft delete** — desactiva el usuario (`activo = false`) sin eliminar el registro.

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | `{"message": "Usuario desactivado correctamente"}` |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso |
| `404 Not Found` | Usuario no encontrado |
| `500 Internal Server Error` | Error al actualizar el registro |

---

### 6.4 Roles

**Prefijo:** `/api/v1/roles`

#### `GET /`
Lista todos los roles del sistema.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de roles |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `500 Internal Server Error` | Error interno |

---

#### `GET /{rol_id}`
Obtiene un rol por ID.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Datos del rol |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | Rol no encontrado |
| `500 Internal Server Error` | Error interno |

---

#### `POST /`
Crea un nuevo rol.

**Auth:** SUPER_ADMIN

**Body:**
```json
{
  "nombre": "AUDITOR_INTERNO",
  "descripcion": "Auditor GEE interno del sistema"
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `201 Created` | Rol creado exitosamente |
| `400 Bad Request` | Ya existe un rol con ese nombre |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Solo SUPER_ADMIN puede crear roles |
| `422 Unprocessable Entity` | `nombre` fuera del enum `RolNombreEnum` |
| `500 Internal Server Error` | Error interno |

---

#### `DELETE /{rol_id}`
Elimina un rol.

**Auth:** SUPER_ADMIN

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | `{"message": "Rol eliminado correctamente"}` |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Solo SUPER_ADMIN puede eliminar roles |
| `404 Not Found` | Rol no encontrado |
| `500 Internal Server Error` | Error al eliminar (ej: rol asignado a usuarios) |

---

### 6.5 Fincas

**Prefijo:** `/api/v1/fincas`

#### `GET /`
Lista las fincas. Soporta filtros por `provincia` y `canton`.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de fincas (puede ser vacía) |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `500 Internal Server Error` | Error interno |

---

#### `POST /`
Crea una nueva finca.

**Auth:** cualquier token autenticado

**Body:**
```json
{
  "nombre": "Finca Verde",
  "provincia": "Loja",
  "canton": "Loja",
  "area_total_ha": 5.5,
  "tenencia": "PROPIA",
  "latitud": -4.0,
  "longitud": -79.2,
  "productor_id": "uuid-del-usuario"
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `201 Created` | Finca creada exitosamente |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `422 Unprocessable Entity` | `nombre` faltante o `tenencia` con valor inválido |
| `500 Internal Server Error` | Error al persistir |

---

#### `GET /{finca_id}`
Obtiene una finca por ID.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Datos de la finca |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | Finca no encontrada |
| `500 Internal Server Error` | Error interno |

---

#### `PATCH /{finca_id}`
Actualiza datos de la finca.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Finca actualizada |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (ej: CLIENTE, AUDITOR_EXTERNO) |
| `404 Not Found` | Finca no encontrada |
| `422 Unprocessable Entity` | `tenencia` con valor inválido |
| `500 Internal Server Error` | Error al actualizar |

---

#### `DELETE /{finca_id}`
Elimina una finca.

**Auth:** SUPER_ADMIN, TENANT_ADMIN

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | `{"message": "Finca eliminada correctamente"}` |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso |
| `404 Not Found` | Finca no encontrada |
| `500 Internal Server Error` | Error al eliminar |

---

### 6.6 Auditoría GEE

**Prefijo:** `/api/v1/auditoria`

#### `GET /`
Lista todas las auditorías.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, AUDITOR_INTERNO, AUDITOR_EXTERNO

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de auditorías |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (ej: CLIENTE, TECNICO_CAMPO) |
| `500 Internal Server Error` | Error interno |

---

#### `POST /`
Registra el resultado de una auditoría GEE. Al crear una auditoría:
1. Se almacena el resultado (`APROBADO` / `RECHAZADO`).
2. El campo `estado` del expediente se actualiza automáticamente.
3. Se agrega un evento al historial de trazabilidad del expediente.
4. `ejecutado_por` toma el valor del `sub` del token si no se especifica.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, AUDITOR_INTERNO

**Body:**
```json
{
  "expediente_id": "uuid-del-expediente",
  "resultado": "APROBADO",
  "deforestacion_detectada": false,
  "fuente": "Google Earth Engine",
  "observaciones": "Sin hallazgos de deforestación en el período analizado",
  "fecha_corte": "2024-12-31T00:00:00Z"
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `201 Created` | Auditoría registrada, expediente actualizado, historial creado |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (ej: AUDITOR_EXTERNO, CLIENTE) |
| `404 Not Found` | Expediente no encontrado |
| `422 Unprocessable Entity` | `resultado` fuera del enum o `expediente_id` faltante |
| `500 Internal Server Error` | Error al crear la auditoría |

---

#### `GET /expediente/{expediente_id}`
Lista todas las auditorías de un expediente.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de auditorías del expediente |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | Expediente no encontrado |
| `500 Internal Server Error` | Error interno |

---

#### `GET /{auditoria_id}`
Obtiene una auditoría por ID.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Datos de la auditoría |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | Auditoría no encontrada |
| `500 Internal Server Error` | Error interno |

---

### 6.7 Certificados DDS

**Prefijo:** `/api/v1/certificados`

#### `GET /`
Lista todos los certificados.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, AUDITOR_INTERNO, AUDITOR_EXTERNO

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de certificados |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (ej: CLIENTE, TECNICO_CAMPO) |
| `500 Internal Server Error` | Error interno |

---

#### `POST /`
Genera un certificado DDS. Reglas de negocio:
1. El expediente debe existir.
2. El expediente debe tener al menos una auditoría GEE con `resultado = APROBADO` (HTTP 400 si no).
3. El código se genera automáticamente: `DDS-{año}-{8 caracteres hex en mayúsculas}`.
4. Se registra un evento en el historial del expediente.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, AUDITOR_INTERNO

**Body:**
```json
{
  "expediente_id": "uuid-del-expediente",
  "fecha_vencimiento": "2026-12-31T00:00:00Z",
  "url_documento": "https://storage.ejemplo.com/cert-123.pdf"
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `201 Created` | Certificado generado con código `DDS-YYYY-XXXXXXXX` |
| `400 Bad Request` | No existe auditoría GEE con resultado `APROBADO` |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Rol sin permiso (ej: AUDITOR_EXTERNO, CLIENTE) |
| `404 Not Found` | Expediente no encontrado |
| `422 Unprocessable Entity` | `expediente_id` faltante o tipo de dato incorrecto |
| `500 Internal Server Error` | Error al generar el certificado |

---

#### `GET /expediente/{expediente_id}`
Lista los certificados de un expediente.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de certificados del expediente |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | Expediente no encontrado |
| `500 Internal Server Error` | Error interno |

---

#### `GET /{certificado_id}`
Obtiene un certificado por ID.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Datos del certificado |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | Certificado no encontrado |
| `500 Internal Server Error` | Error interno |

---

#### `PATCH /{certificado_id}/revocar`
Revoca un certificado (cambia estado a `REVOCADO`).

**Auth:** SUPER_ADMIN, TENANT_ADMIN

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Certificado con `estado = REVOCADO` |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Solo SUPER_ADMIN y TENANT_ADMIN pueden revocar |
| `404 Not Found` | Certificado no encontrado |
| `500 Internal Server Error` | Error al revocar |

---

### 6.8 Variables Dinámicas

**Prefijo:** `/api/v1/variables`

Variables configurables por sección (módulo) del formulario agroambiental. Cada variable puede tener tipo de dato: STRING, NUMBER, DATE, BOOLEAN.

#### `GET /`
Lista todas las variables dinámicas (sin filtro — para panel administrativo).

**Auth:** SUPER_ADMIN, TENANT_ADMIN

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de todas las variables |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin permiso (solo admin) |
| `500 Internal Server Error` | Error interno |

---

#### `GET /search/por-nombre?nombre=xxx`
Busca variables por nombre (case-insensitive).

**Auth:** SUPER_ADMIN, TENANT_ADMIN

**Query params:**
- `nombre` — texto a buscar en el nombre (requerido)

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de variables coincidentes |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin permiso |
| `422 Unprocessable Entity` | Query param `nombre` faltante |

---

#### `GET /search/por-tipo?tipo=NUMBER`
Busca variables por tipo de dato.

**Auth:** SUPER_ADMIN, TENANT_ADMIN

**Query params:**
- `tipo` — STRING, NUMBER, DATE, BOOLEAN (requerido)

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de variables del tipo especificado |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin permiso |
| `422 Unprocessable Entity` | `tipo` inválido |

---

#### `GET /search/por-seccion?seccion=Biodiversidad`
Busca variables por sección/módulo (case-insensitive).

**Auth:** SUPER_ADMIN, TENANT_ADMIN

**Query params:**
- `seccion` — nombre del módulo (ej: "Biodiversidad", "Carbono") (requerido)

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de variables de la sección |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin permiso |
| `422 Unprocessable Entity` | `seccion` faltante |

---

#### `GET /{dato_id}`
Lista variables dinámicas de un registro agroambiental específico.

**Auth:** cualquier token autenticado

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Lista de variables del dato |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin token válido |
| `404 Not Found` | Dato agroambiental no encontrado |

---

#### `POST /{dato_id}`
Agrega una variable dinámica a un registro agroambiental.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO

**Body:**
```json
{
  "nombre": "Índice de Biodiversidad (Shannon-Wiener)",
  "tipo_dato": "NUMBER",
  "seccion": "Módulo de Biodiversidad",
  "valor": 2.5
}
```

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `201 Created` | Variable creada |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin permiso |
| `404 Not Found` | Dato no encontrado |
| `422 Unprocessable Entity` | `nombre` o `tipo_dato` faltantes |

---

#### `PATCH /{dato_id}/{variable_id}`
Actualiza una variable dinámica.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | Variable actualizada |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin permiso |
| `404 Not Found` | Variable no encontrada |
| `500 Internal Server Error` | Error al actualizar |

---

#### `DELETE /{dato_id}/{variable_id}`
Elimina una variable dinámica.

**Auth:** SUPER_ADMIN, TENANT_ADMIN, TECNICO_CAMPO, AUDITOR_INTERNO

**Códigos de respuesta:**

| Código | Descripción |
|---|---|
| `200 OK` | `{"message": "Variable eliminada correctamente"}` |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin permiso |
| `404 Not Found` | Variable no encontrada |
| `500 Internal Server Error` | Error al eliminar |

---

## 7. Enums y Valores Permitidos

Todos los valores deben enviarse en **MAYÚSCULAS**.

| Enum | Valores válidos |
|---|---|
| `GeneroEnum` | `MASCULINO`, `FEMENINO` |
| `TenenciaEnum` | `PROPIA`, `POSESION`, `ARRENDAMIENTO` |
| `EstadoEnum` (expediente) | `PENDIENTE`, `EN_PROCESO`, `APROBADO`, `RECHAZADO` |
| `RolNombreEnum` | `SUPER_ADMIN`, `TENANT_ADMIN`, `CLIENTE`, `TECNICO_CAMPO`, `AUDITOR_INTERNO`, `AUDITOR_EXTERNO` |
| `ResultadoAuditoriaEnum` | `APROBADO`, `RECHAZADO` |
| `EstadoCertificadoEnum` | `VIGENTE`, `VENCIDO`, `REVOCADO` |

> Los enums son validados por Pydantic. Enviar un valor no listado devuelve **HTTP 422 Unprocessable Entity**.

---

## 8. Lógica de Negocio

### Generación del EUDR ID
Al crear un expediente, se genera automáticamente un identificador único:
```
uuidv4-{8 chars hex}-{5 chars hex}
Ejemplo: uuidv4-2A43E5A5-3EC5C
```

### Trazabilidad automática
El historial se actualiza automáticamente en los siguientes eventos:

| Evento | Acción registrada |
|---|---|
| Creación del expediente | `"Expediente creado"` |
| Actualización del expediente | `"Expediente actualizado"` |
| Registro de auditoría GEE | `"Auditoría GEE ejecutada"` |
| Registro de datos agroambientales | `"Datos agroambientales registrados"` |
| Emisión de certificado DDS | `"Certificado DDS generado"` |

### Ciclo de vida del estado del expediente

```
PENDIENTE ──► EN_PROCESO ──► APROBADO
                         └──► RECHAZADO
```

El estado cambia automáticamente al registrar una auditoría GEE:
- `resultado = APROBADO` → `expediente.estado = APROBADO`
- `resultado = RECHAZADO` → `expediente.estado = RECHAZADO`

### Requisito para emitir certificado DDS

```
expediente.auditorias.find(resultado == "APROBADO") → requerido
     ↓ NO existe
HTTP 400: "El expediente requiere una auditoría GEE con resultado APROBADO"
     ↓ SÍ existe
Certificado generado con código DDS-{año}-{hex}
```

### Hash de contraseñas
Las contraseñas se hashean con `bcrypt` (salt automático):
```python
bcrypt.hashpw(password.encode(), bcrypt.gensalt())
```

### Soft Delete de usuarios
Los usuarios no se eliminan físicamente. El endpoint `DELETE /usuarios/{id}` solo establece `activo = false`.

---

## 9. Configuración del Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Base de datos PostgreSQL (Neon serverless)
DATABASE_URL="postgresql://usuario:password@host/neondb?sslmode=require&channel_binding=require"

# JWT — clave compartida con auth-service (HS256)
SECRET_KEY="stgc-Auth-2026-v1-xK9mPqRz2wL7nBv4Jd8Sf3Gh5Tq1Wx0Zy"

# Comunicación S2S con auth-service
INTERNAL_API_KEY="STGC-Audit-Internal-9f8d7c6b5a4e3w2q1o0pLKmJnHgBfDcSa"

# Validación de sesión contra auth-service
AUTH_SERVICE_URL=https://huellaaltura.onrender.com
SESSION_VALIDATION_ENABLED=true
```

> **IMPORTANTE:** `.env` nunca se sube al repositorio (`.gitignore`).

---

## 10. Instalación y Puesta en Marcha

### Requisitos
- Python 3.11+
- Node.js (requerido por Prisma CLI para generar el cliente)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/KevinSarango1/backend-kevin-sarango.git
cd backend-kevin-sarango/backend-kevin-sarango

# 2. Crear y activar entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Crear archivo .env
copy .env.example .env
# Editar .env con las claves reales

# 5. Generar cliente Prisma y crear la base de datos
python init_db.py

# 6. Iniciar el servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Acceso a la documentación interactiva
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Ejecutar los tests
```bash
pip install requests
python test_api.py
# Resultado esperado: TOTAL: 42 | PASS: 42 | FAIL: 0
```

---

## 11. Dependencias

| Paquete | Versión | Uso |
|---|---|---|
| `fastapi` | 0.111.0 | Framework web principal |
| `uvicorn[standard]` | 0.29.0 | Servidor ASGI |
| `prisma` | 0.13.1 | ORM — cliente Python para PostgreSQL |
| `python-dotenv` | 1.2.2 | Carga de `.env` |
| `pydantic` | 2.7.1 | Validación de datos |
| `pydantic-settings` | 2.2.1 | Configuración desde variables de entorno |
| `python-jose[cryptography]` | 3.3.0 | JWT HS256 (validación local) |
| `ruff` | >=0.4.0 | Linter (dev) |
| `pytest` | >=8.0.0 | Testing (dev) |

---

*Documentación actualizada para GeoGuard EUDR Backend v2.1.0 (PostgreSQL/Neon, Productor independiente, Variables Dinámicas)*
