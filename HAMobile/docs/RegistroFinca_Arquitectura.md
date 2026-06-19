# Arquitectura del Módulo de Registro de Finca

El componente `RegistroFincaScreen` era un archivo monolítico que superaba las 800 líneas, complicando su mantenimiento, legibilidad y reutilización. Para seguir una arquitectura más limpia ("Clean Architecture" y principios SOLID en React), el módulo se ha refactorizado y separado en componentes especializados y "custom hooks".

## Estructura de Directorios

El nuevo módulo reside en `src/screens/main/registro-finca/` y posee la siguiente estructura:

```
src/screens/main/registro-finca/
│
├── index.js                     # Componente Contenedor Principal (Orquestador)
├── styles.js                    # Estilos centralizados y reutilizables
│
├── hooks/
│   └── useRegistroFinca.js      # Lógica de Negocio, Estado y Funciones de API/DB Local
│
└── components/
    ├── ProgressBar.js           # Indicador visual de los pasos del formulario
    ├── Step1Productor.js        # Formulario de solo lectura (Datos de perfil de usuario)
    ├── Step2Finca.js            # Georreferenciación y datos técnicos del predio
    └── Step3Agroambiental.js    # Variables agroambientales y dinámicas
```

## Detalles de la Refactorización

### 1. `hooks/useRegistroFinca.js`
Este Custom Hook abstrae **todo el estado del formulario** y las complejas lógicas de negocio, permitiendo que la vista se dedique exclusivamente a renderizar interfaces. 
*   **Gestión de Estado:** Maneja docenas de variables (nombreProductor, latitud, biomasaArboles, etc.).
*   **Efectos (useEffect):** Se encarga de llamar a `/auth/me` asíncronamente para llenar autocompletado en el Paso 1, y de recalcular el `EUDR ID` / Autocompletado Político cuando las coordenadas o el polígono del mapa cambian.
*   **Lógica Funcional:** Contiene el proceso de geolocalización de GPS, la gestión de la pizarra para dibujar el polígono del mapa y la persistencia (SQLite) para guardar de manera "offline-first".

### 2. Componentes Funcionales Puros (`components/`)
La interfaz gráfica principal se fragmentó en tres componentes clave, cada uno respondiendo al concepto de Responsabilidad Única (SRP). Reciben toda su información y funciones actualizadoras (ej. `setNombreFinca`) mediante *props* que le inyecta el Contenedor Principal.
*   `Step1Productor.js`: Renderiza estrictamente campos bloqueados (solo-lectura).
*   `Step2Finca.js`: Agrupa toda la interfaz del mapa (`FarmMapEditor`) e incluye variables espaciales y de la propiedad.
*   `Step3Agroambiental.js`: Se centra en la captura de métricas ecológicas e integra el micro-motor para variables dinámicas (permitiendo al usuario inyectar campos no contemplados en la estructura predeterminada).

### 3. Componente Orquestador (`index.js`)
El entry-point del directorio invoca el Hook `useRegistroFinca()`, extrae las piezas del estado necesario y provee renderizado condicional inteligente para decidir si renderiza la pantalla del mapa en pantalla completa, o bien, cuál de los 3 pasos del `ScrollView` corresponde mostrar.

### 4. Estilos Centralizados (`styles.js`)
Todos los recursos `StyleSheet.create` se abstrajeron en este archivo independiente, manteniendo la consistencia UI (colores y tipografía mediante el `theme`) y removiendo la "basura visual" de los componentes principales.

## Beneficios
- **Testabilidad:** Ahora es posible crear tests unitarios solo para `useRegistroFinca.js` (validando las transformaciones de estado y almacenamiento en la BD local) sin levantar o mockear el DOM de React Native.
- **Mantenibilidad:** Agregar un nuevo paso (`Step 4`) u otra sección es extremadamente sencillo: Basta con agregar un archivo a `components/` e integrarlo en la matriz de vistas del `index.js`.
- **Rendimiento Visual:** Los componentes de React sufren de re-renderizados continuos al escribir en inputs. Si en el futuro se optimiza aún más usando librerías como `React Hook Form`, la estructura ya está diseñada de forma modular para no entorpecer partes críticas de la vista principal como el Mapa Completo.
