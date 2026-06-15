# Documentación Técnica: Módulo 1 - Captura Offline-First (EUDR)

## 1. Visión General
Este módulo se encarga de la recolección de datos de productores y fincas en condiciones de baja o nula conectividad. Utiliza una arquitectura **Offline-First** basada en el patrón **Transactional Outbox** para garantizar la integridad de los datos.

## 2. Pila Tecnológica (Stack)
* **Motor de Base de Datos:** SQLite (SQLCipher para cifrado).
* **Driver:** `op-sqlite` (alto rendimiento y soporte nativo de cifrado).
* **ORM:** Drizzle ORM (TypeScript-first, ligero).
* **Seguridad de Llaves:** `expo-crypto` y `expo-application`.

## 3. Arquitectura de Seguridad (RS-SEC-004)
La base de datos está cifrada en reposo. La llave de encriptación no se almacena de forma persistente como un secreto estático, sino que se deriva dinámicamente mediante:
1. **Identificador de Hardware:** Atado al dispositivo físico (Android ID / iOS Vendor ID).
2. **PIN del Usuario:** Secreto conocido solo por el usuario.
3. **PBKDF2:** Algoritmo de derivación de llave para resistir ataques de fuerza bruta.

Referencia: `src/data/local/database.ts`

## 4. Aislamiento Multi-inquilino (RS-SEC-002)
El aislamiento se garantiza mediante una **capa lógica en el Repositorio**. Cada instancia de `FarmRepository` requiere un `tenant_id` obligatorio en su constructor. Todos los métodos de consulta y escritura inyectan automáticamente este filtro en las cláusulas `where` de Drizzle.

Referencia: `src/data/repository/FarmRepository.ts`

## 5. Motor de Sincronización (Outbox Pattern)
Para asegurar que ningún dato capturado offline se pierda, implementamos el patrón **Outbox**:

1. **Escritura Atómica:** Cada vez que se crea una Finca (`createWithVertices`), Drizzle abre una transacción SQLite.
2. **Registro Dual:** Se guarda la entidad en la tabla de dominio (`farms`) y simultáneamente se crea un evento en la tabla `sync_queue`.
3. **Garantía FIFO:** Los eventos se procesan en el servidor en el mismo orden en que fueron creados en el dispositivo.

### Flujo de Sincronización:
* **Estado PENDING:** El registro se crea offline.
* **Estado PROCESSING:** El `SyncEngine` intenta enviarlo al servidor.
* **Estado COMPLETED:** El servidor confirmó la recepción (HTTP 20x).
* **Estado FAILED:** Error de red o servidor. Se activa la lógica de reintentos (`retry_count`).

## 6. Estructura de Datos Geoespaciales (RF-MOB-002)
El cumplimiento EUDR exige precisión en los polígonos.
* **farms:** Almacena el GeoJSON consolidado y el área geodésica.
* **polygon_vertices:** Almacena cada punto individual con su precisión GPS (`accuracy_meters`) y orden de secuencia para reconstrucción topográfica fiel.

Referencia: `src/data/local/schema.ts`

## 7. Flex-Core (RF-WEB-002)
La columna `custom_data` en la tabla `farms` es un campo JSON que permite almacenar módulos dinámicos (Biodiversidad, Carbono, etc.) definidos por cada inquilino, manteniendo la flexibilidad sin sacrificar la estructura relacional.
