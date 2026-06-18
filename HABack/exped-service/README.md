# GeoGuard EUDR — Backend Expedientes

Backend **FastAPI** para gestión de expedientes EUDR, trazabilidad agroambiental y cumplimiento normativo.

**Endpoint en producción:** https://geoguard-exped.onrender.com  
**Última actualización:** 2026-06-17

---

## Arquitectura

```
Usuario (auth-service) con rol GENERAL
            ↓
          Finca ──► Expediente ──► Auditoría GEE
            │            │
            │            └──► Datos Agroambientales
            │                        │
            │                        └──► Variables Dinámicas
            └────────────────────────────► Certificado DDS
```

**Flujo completo:**
1. Usuario con rol **GENERAL** (creado en auth-service)
2. Crear Finca vinculada al Usuario (auto-genera EUDR ID)
3. Crear Expediente (vinculado a Finca)
4. Registrar Datos Agroambientales (con Variables Dinámicas opcionales)
5. Auditoría GEE (actualiza estado a APROBADO/RECHAZADO)
6. Certificado DDS (requiere auditoría APROBADA)
7. Trazabilidad automática en cada paso

---

## Endpoints principales

### Fincas `/api/v1/fincas`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar fincas |
| POST | `/` | Crear finca (vinculada a Productor) |
| GET | `/{id}` | Obtener por ID |
| PATCH | `/{id}` | Actualizar |
| DELETE | `/{id}` | Eliminar |

### Expedientes `/api/v1/expedientes`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar expedientes |
| POST | `/` | Crear expediente |
| GET | `/eudr/{eudr_id}` | Buscar por EUDR ID |
| GET | `/{id}` | Obtener por ID |
| PATCH | `/{id}` | Actualizar estado |
| DELETE | `/{id}` | Eliminar |
| GET | `/{id}/historial` | Ver trazabilidad |
| POST | `/{id}/historial` | Agregar evento |

### Variables Dinámicas `/api/v1/variables`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar todas (administrativo) |
| GET | `/search/por-nombre?nombre=xxx` | Buscar por nombre |
| GET | `/search/por-tipo?tipo=NUMBER` | Buscar por tipo |
| GET | `/search/por-seccion?seccion=xxx` | Buscar por sección |
| GET | `/{dato_id}` | Listar de un dato específico |
| POST | `/{dato_id}` | Crear variable |
| PATCH | `/{dato_id}/{variable_id}` | Actualizar |
| DELETE | `/{dato_id}/{variable_id}` | Eliminar |

### Agroambiental `/api/v1/agroambiental`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/{expediente_id}` | Obtener datos |
| POST | `/{expediente_id}` | Registrar datos |
| PUT | `/{expediente_id}/{dato_id}` | Actualizar |
| GET | `/resumen/carbono` | Resumen stock de carbono |

### Auditoría GEE `/api/v1/auditoria`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar auditorías |
| POST | `/` | Registrar resultado |
| GET | `/expediente/{id}` | Por expediente |

### Certificados DDS `/api/v1/certificados`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar certificados |
| POST | `/` | Generar certificado |
| GET | `/expediente/{id}` | Por expediente |
| PATCH | `/{id}/revocar` | Revocar |

---

## Instalación local

```bash
# 1. Crear entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Crear .env (copiar de .env.example)
cp .env.example .env

# 4. Generar cliente Prisma
python -m prisma generate

# 5. Aplicar migraciones (si es necesario)
python -m prisma db push

# 6. Iniciar servidor
uvicorn app.main:app --reload --port 8031
```

**URLs locales:**
- API: http://localhost:8031
- Docs: http://localhost:8031/docs
- Health: http://localhost:8031/health

---

## Stack tecnológico

| Componente | Versión | Descripción |
|------------|---------|-------------|
| FastAPI | 0.111.0 | Framework web |
| Prisma | 0.13.1 | ORM Python |
| PostgreSQL | Neon | Base de datos serverless |
| JWT | python-jose | Autenticación |
| Validación | Pydantic v2 | Esquemas de datos |
| Servidor | Uvicorn | ASGI |
| Python | 3.11+ | Runtime |

---

## Variables de entorno

```env
# Base de datos PostgreSQL (Neon)
DATABASE_URL=postgresql://usuario:password@host/database?sslmode=require

# Autenticación JWT
SECRET_KEY="clave_compartida_con_auth_service"

# Comunicación S2S
INTERNAL_API_KEY="clave_interna_entre_servicios"

# Validación de sesión
AUTH_SERVICE_URL=https://huellaaltura.onrender.com
SESSION_VALIDATION_ENABLED=true
```

> El archivo `.env` nunca se sube al repositorio (`.gitignore`).
