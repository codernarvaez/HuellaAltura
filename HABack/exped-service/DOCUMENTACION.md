# Documentación del Servicio de Expedientes (expediente-service)

Este servicio es el encargado de la gestión de expedientes, trazabilidad e información agroambiental dentro del ecosistema GeoGuard EUDR.

## 🚀 Documentación Interactiva

La documentación detallada de los endpoints, incluyendo modelos de datos, parámetros y respuestas, está disponible de forma interactiva en:

- **Redoc (Recomendado):** [http://localhost:8002/redoc](http://localhost:8002/redoc) - Vista limpia y organizada, ideal para lectura técnica.
- **Swagger UI:** [http://localhost:8002/docs](http://localhost:8002/docs) - Permite probar los endpoints directamente desde el navegador.

> **Nota:** Reemplaza `localhost:8002` por la URL base de tu entorno de despliegue si es necesario.

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

## 👥 Soporte e Información de Contacto

Para consultas técnicas o reporte de bugs, por favor contactar con el equipo de soporte de GeoGuard en `support@geoguard.com`.
