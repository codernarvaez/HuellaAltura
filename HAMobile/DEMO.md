# Guía de demostración en dispositivo — HAMobile

La app incluye un **modo demostración** que funciona 100 % sin conexión y sin
backend: en la pantalla de inicio de sesión, bajo "Modo demostración", hay una
tarjeta por rol. Cada una inicia sesión con un usuario local y siembra datos de
ejemplo en la base SQLite cifrada del dispositivo (una sola vez, idempotente).

## Preparación del build

`expo-document-picker` es un módulo nativo nuevo. Antes de probar en el
dispositivo hay que **recompilar el dev client**:

```bash
cd HAMobile
npm install
eas build --profile development --platform android   # o npx expo run:android
```

Si se usa un dev client antiguo, la app no se rompe: el paso de documentos
ofrece la cámara como alternativa y avisa que el selector de PDF requiere
recompilar.

## Usuarios de demostración

| Rol | Usuario | Qué demuestra |
|---|---|---|
| **Productor** | María Quishpe | Registro de finca con polígono + documentos PDF, cuadrilla de empleados, agendar/ejecutar labores |
| **Técnico de Campo** | Carlos Ramírez | Evaluación agroambiental de fincas, toma de muestras de café (Módulo 3), labores |
| **Auditor Interno** | Lucía Betancourt | Revisión del calendario y aprobación de labores pre-validadas |

Datos sembrados: 2 fincas en Quilanga (Loja) con polígonos WGS84, datos
agroambientales, expedientes, 3 empleados, 4 labores en distintos estados del
flujo (PLANIFICADO → EJECUTADO → PRE_VALIDADO → AUDITADO) y 1 muestra de café.

## Recorrido sugerido por rol

### 1. Productor
1. Entrar como **Productor** → Inicio muestra estadísticas reales de SQLite
   (2 fincas, 2 expedientes, stock de carbono, pendientes de sincronizar).
2. **Registro** → wizard de 3 pasos: productor → finca (GPS + polígono en el
   mapa) → **documentos**: adjuntar la cédula y la escritura como PDF o
   fotografía. Sin los obligatorios, "Finalizar" bloquea el cierre (RF-09).
3. **Labores** → elegir finca → mes actual:
   - "Aplicación de abono orgánico" aparece **Ejecutada**; pulsar
     "Validar Norma" → pasa a Pre-Validada.
   - Agendar una labor nueva (las sugerencias del mes vienen del catálogo local).
   - Ejecutar la labor planificada: elegir **JORNALERO** → seleccionar de la
     cuadrilla (se precargan nombre, edad y salario) o "Escribir manualmente".
     Con edad < 18 el registro se **rechaza** (RF PPC-05). La evidencia
     fotográfica con GPS y marca de agua es obligatoria.
4. **Perfil** → "Mi cuadrilla": crear un empleado nuevo (probar edad 17 → error)
   y retirar uno existente.

### 2. Técnico de Campo
1. Entrar como **Técnico** → pestañas: Inicio, Evaluación, **Muestras**, Labores, Perfil.
2. **Evaluación** → elegir finca → editar parámetros agroambientales → Guardar
   (queda local con sync pendiente).
3. **Muestras** → elegir finca, proceso (Lavado/Honey/Natural muestran su peso
   objetivo), peso en libras con validación en vivo (0,5 kg L/H, 1 kg N, ±10 %);
   fuera de rango el botón se desactiva. El GPS se adjunta automáticamente.
4. **Labores** → mismo flujo del productor (el técnico también puede ejecutar).

### 3. Auditor Interno
1. Entrar como **Auditor** → **Labores** → finca "Las Palmas" → mes actual:
   "Control fitosanitario de broca" está **Pre-Validada** y muestra el botón
   **"Aprobar (Auditor)"** (oculto para los otros roles) → aprobar → AUDITADO.
2. Inicio → botón principal "Revisar Labores".

## Comportamiento online

Con una sesión real (login contra auth-service) los mismos flujos usan los
backends: calendario/agendar/ejecutar contra `exped-service /api/v1/labores`
(ahora con `edad_jornalero` y `dias_trabajo` validados también en el servidor)
y muestras contra `POST /acopio/muestras/`. Sin red, todo cae a SQLite con
`sync_status='pending'`.

## Espacios para implementación posterior

- Subida de documentos al object storage privado (`DocumentosService`, Track A4).
- Sincronización de labores/ejecuciones/muestras/empleados (`SyncService`, Track C2).
- Validación normativa real en modo offline (hoy se simula y se marca como tal).
