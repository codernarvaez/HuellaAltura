# GeoGuard EUDR — Backend Expedientes

Backend **FastAPI** para gestión de expedientes EUDR, trazabilidad agroambiental y cumplimiento normativo.

**Endpoint en producción:** https://geoguard-exped.onrender.com  
**Última actualización:** 2026-06-17

---

## Arquitectura

```
Usuario (auth-service) con rol PRODUCTOR
            ↓
          Finca ──► Expediente ──► Auditoría GEE
            │            │
            │            └──► Datos Agroambientales
            │                        │
            │                        └──► Variables Dinámicas
            └────────────────────────────► Certificado DDS
```

**Flujo completo:**
1. Usuario con rol **PRODUCTOR** (creado en auth-service como rol por defecto)
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

### Módulo 3 — Acopio, Procesamiento y Exportación `/acopio`

| Método | Ruta | Rol requerido | RF |
|--------|------|---------------|-----|
| POST | `/acopio/muestras/` | `TECNICO_CAMPO` | APE-01, APE-02 |
| POST | `/acopio/laboratorio/fisico` | `ANALISTA_FISICO` | APE-03 |
| POST | `/acopio/laboratorio/sensorial` | `CATADOR_Q` | APE-04, APE-05 |
| POST | `/acopio/compras/aprobar` | `GERENCIA_ACOPIO` | APE-06, APE-07 |
| POST | `/acopio/bodega/ingreso` | `BODEGUERO` | APE-08 |
| GET | `/acopio/bodega/{inventario_id}` | `BODEGUERO` | APE-08 |
| POST | `/acopio/trilla/procesar` | `BODEGUERO` | RS-AGR-003 |
| POST | `/acopio/despachos/registrar` | `GERENCIA_ACOPIO` | Antifraude de segregación |
| GET | `/acopio/despachos/certificado/{id}` | `AUDITOR_INTERNO` | Trazabilidad consolidada |
| GET | `/acopio/despachos/certificado/{id}/pdf` | `AUDITOR_INTERNO` | Certificado descargable |

`SUPER_ADMIN` y `TENANT_ADMIN` conservan acceso transversal. Los grupos de rol
se definen en `app/routers/acopio/roles.py`.

**Reglas de negocio del módulo:**

- **Peso de muestra (APE-01):** 0,5 kg para Lavado y Honey, 1 kg para Natural,
  con ±10 % de tolerancia de báscula. El peso se envía en libras y se valida
  ya convertido.
- **Análisis físico (APE-03):** humedad fuera de 10–12 %, criba fuera de 14–18
  o cualquier defecto primario marcan el lote como **no conforme**, pero el
  análisis se registra igual. La medición real nunca se descarta.
- **Catación (APE-04):** puntaje = suma de los 10 atributos SCA **menos** la
  penalización por defectos de taza. Especialidad a partir de 80 puntos.
- **Compra (APE-07):** bloqueo duro si la finca no tiene auditoría EUDR
  aprobada o si se detectó deforestación post-2020.
- **Despacho:** Σ kg de salida nunca puede superar Σ kg de ingreso.

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

## Pruebas

```bash
# Unitarias (no requieren base de datos)
python -m pytest tests/test_health.py tests/test_geoespacial.py -q
```

Las pruebas de integración necesitan una base PostgreSQL local. **Nunca las
ejecutes contra la base de producción**: `prisma db push` altera el esquema.

```bash
# 1. Crear la base de pruebas (una sola vez)
createdb geoguard_test        # o: psql -U postgres -c "CREATE DATABASE geoguard_test;"

# 2. Aplicar el esquema
DATABASE_URL="postgresql://postgres@localhost:5432/geoguard_test" \
  python -m prisma db push

# 3. Ejecutar toda la suite
DATABASE_URL="postgresql://postgres@localhost:5432/geoguard_test" \
  python -m pytest tests/ -q
```

Si la base no está disponible, los módulos de integración se omiten
automáticamente en lugar de fallar.

| Módulo | Cubre |
|--------|-------|
| `tests/test_integracion_expediente.py` | Productor, formularios dinámicos, documentos y completitud |
| `tests/test_integracion_acopio.py` | Muestras, laboratorio SCA, EUDR, bodega, trilla y despacho |
| `tests/test_integracion_cumplimiento.py` | Listas de sanciones, bloqueo automático y firma digital |

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

# Orígenes permitidos por CORS, separados por coma.
# Debe configurarse en el panel de Render antes del próximo despliegue
# o el frontend quedará bloqueado.
CORS_ORIGINS=http://localhost:4321,https://tu-dominio-web
```

> El archivo `.env` nunca se sube al repositorio (`.gitignore`).

### Seed de `auth-service`

El usuario administrador ya no tiene contraseña fija en el código. `seed.py`
lee del entorno:

```env
SEED_ADMIN_EMAIL=admin@tu-dominio
SEED_ADMIN_PASSWORD=      # opcional: si se omite se genera una aleatoria
```

Sin `SEED_ADMIN_EMAIL` el seed solo sincroniza los roles y no crea ningún
usuario.
