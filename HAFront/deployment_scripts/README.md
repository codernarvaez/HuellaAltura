# 🚀 Frontend - Guía de Ejecución y Despliegue

Frontend Astro para HuellaAltura con Tailwind CSS, Leaflet Maps y Supabase.

## 📋 Requisitos Previos

- **Node.js** >= 22.12.0 ([Descargar](https://nodejs.org))
- **npm** >= 10.x (incluido con Node.js)
- **Git** (para clonar y actualizar)

**Verificar versiones:**
```bash
node --version   # Debe mostrar v22.12.0 o superior
npm --version    # Debe mostrar 10.x o superior
```

---

## 🎯 Inicio Rápido

### En Windows (PowerShell)

```powershell
# 1. Instalar dependencias (solo primera vez)
.\deployment_scripts\windows\install_dependencies.ps1

# 2. Iniciar desarrollo
.\deployment_scripts\windows\start_dev.ps1

# 3. Abrir navegador: http://localhost:3000
```

### En Linux / macOS (Bash)

```bash
# 1. Instalar dependencias (solo primera vez)
bash deployment_scripts/scripts/install_dependencies.sh

# 2. Iniciar desarrollo
bash deployment_scripts/scripts/start_dev.sh

# 3. Abrir navegador: http://localhost:3000
```

---

## 📚 Scripts Disponibles

### Windows (PowerShell)

| Script | Propósito |
|--------|-----------|
| `install_dependencies.ps1` | Instala Node.js + dependencias |
| `start_dev.ps1` | Inicia servidor de desarrollo (puerto 3000) |
| `build.ps1` | Compila para producción |
| `start_production.ps1` | Inicia servidor con build compilado |

**Ubicación:** `deployment_scripts\windows\`

### Linux / macOS (Bash)

| Script | Propósito |
|--------|-----------|
| `install_dependencies.sh` | Instala Node.js + dependencias |
| `start_dev.sh` | Inicia servidor de desarrollo |
| `build.sh` | Compila para producción |
| `start_production.sh` | Inicia servidor con build compilado |
| `check.sh` | Verifica tipos TypeScript |

**Ubicación:** `deployment_scripts/scripts/`

---

## 🔄 Flujos de Trabajo

### 1️⃣ Desarrollo Local

```powershell
# Windows
.\deployment_scripts\windows\install_dependencies.ps1
.\deployment_scripts\windows\start_dev.ps1
```

```bash
# Linux/macOS
bash deployment_scripts/scripts/install_dependencies.sh
bash deployment_scripts/scripts/start_dev.sh
```

**Características:**
- ✅ Hot reload automático
- ✅ TypeScript compilado en vivo
- ✅ Tailwind CSS actualizado
- ✅ Accesible en: http://localhost:3000

**Detener:** Presiona `Ctrl+C`

---

### 2️⃣ Compilar para Producción

```powershell
# Windows
.\deployment_scripts\windows\build.ps1
```

```bash
# Linux/macOS
bash deployment_scripts/scripts/build.sh
```

**Qué sucede:**
1. Verifica tipos TypeScript
2. Optimiza código y assets
3. Minifica CSS y JavaScript
4. Genera carpeta `dist/` lista para desplegar

**Output:** `dist/` (lista para Render o cualquier host)

---

### 3️⃣ Probar Build Localmente

```powershell
# Windows
.\deployment_scripts\windows\build.ps1
.\deployment_scripts\windows\start_production.ps1
```

```bash
# Linux/macOS
bash deployment_scripts/scripts/build.sh
bash deployment_scripts/scripts/start_production.sh
```

**Accesible en:** http://localhost:3000 (versión optimizada)

---

### 4️⃣ Verificar Tipos y Linting

```bash
# Linux/macOS
bash deployment_scripts/scripts/check.sh
```

```bash
# Windows (sin script dedicado, ejecuta manualmente)
npm run check
npm run lint
```

**Verifica:**
- Errores de tipos TypeScript
- Sintaxis de archivos Astro
- Importaciones

---

## 📁 Estructura del Proyecto

```
HAFront/
├── src/
│   ├── pages/              # Páginas Astro (.astro)
│   │   ├── index.astro
│   │   ├── dashboard.astro
│   │   ├── auditoriaSatelital.astro
│   │   └── ...
│   ├── components/         # Componentes reutilizables
│   │   ├── Navbar.astro
│   │   ├── Card.astro
│   │   └── ...
│   ├── layouts/           # Layouts base
│   ├── lib/              # Utilidades y funciones
│   │   ├── api.ts        # Funciones de llamadas al backend
│   │   ├── auth.ts       # Autenticación con Supabase
│   │   └── ...
│   └── styles/           # CSS global
├── public/               # Archivos estáticos (images, fonts)
├── dist/                 # Build compilado (generado por npm run build)
├── deployment_scripts/   # Scripts de despliegue
│   ├── scripts/         # Bash scripts (Linux/macOS)
│   └── windows/         # PowerShell scripts
├── package.json         # Dependencias y scripts npm
├── astro.config.mjs     # Configuración de Astro
├── tsconfig.json        # Configuración de TypeScript
└── tailwind.config.js   # Configuración de Tailwind CSS
```

---

## 🌍 Variables de Entorno

Crea un archivo `.env` en `HAFront/`:

```env
# Backend API
PUBLIC_API_URL=http://localhost:8001

# O para producción (Render)
PUBLIC_API_URL=https://api.tu-dominio.com

# Supabase (si lo usas)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

**Notas:**
- Las variables prefijadas con `PUBLIC_` son accesibles en el cliente
- No incluyas `.env` en Git (agrega a `.gitignore`)
- En Render, configura estas en **Settings → Environment**

---

## 🛠️ Comandos npm Directos

Si prefieres ejecutar directamente sin scripts:

```bash
# Instalar dependencias
npm install

# Desarrollo con hot reload
npm run dev

# Compilar para producción
npm run build

# Probar build compilado
npm start

# Verificar tipos TypeScript
npm run check

# Linter (Astro check)
npm run lint

# Preview (legacy)
npm run preview

# Acceso a CLI de Astro
npm run astro -- --help
```

---

## 🚀 Despliegue en Render

### Configuración Automática

1. **Conectar GitHub a Render:**
   - Render Dashboard → Connect a repository
   - Selecciona el repo de HuellaAltura

2. **Crear Web Service:**
   - Name: `huellaatura-front`
   - Root Directory: `HAFront/`
   - Runtime: `Node`
   - Node version: `22.12.0`

3. **Build Command:**
   ```bash
   npm install && npm run build
   ```

4. **Start Command:**
   ```bash
   npm start
   ```

5. **Environment Variables:**
   ```
   PUBLIC_API_URL=https://tu-api-render.onrender.com
   PUBLIC_SUPABASE_URL=...
   PUBLIC_SUPABASE_ANON_KEY=...
   ```

6. **Deploy:** Render se dispara automáticamente en cada push a `main`

### Deploy Manual

```bash
# Desde local
cd HAFront
npm run build

# Render detecta dist/ y lo sirve automáticamente
git add dist/
git commit -m "Deploy frontend"
git push
```

---

## 🔍 Troubleshooting

### "Node.js no está instalado"

**Solución:**
1. Descarga desde https://nodejs.org (v22.12.0+)
2. Reinstala y reinicia terminal
3. Verifica: `node --version`

### "npm: command not found"

**Solución:**
- npm se instala con Node.js
- Reinstala Node.js completo
- Reinicia tu terminal después de instalar

### "Error: Could not find Astro"

**Solución:**
```bash
npm install
npm run dev
```

### Puerto 3000 ya en uso

**Solución (Linux/macOS):**
```bash
# Ver qué proceso usa el puerto
lsof -i :3000

# Matar el proceso
kill -9 <PID>

# Luego reiniciar
npm run dev
```

**Solución (Windows):**
```powershell
# Ver proceso
netstat -ano | findstr :3000

# Matar proceso
taskkill /PID <PID> /F
```

### "dist/ not found" al ejecutar producción

**Solución:**
```bash
npm run build        # Primero compilar
npm start            # Luego iniciar
```

### Hot reload no funciona

**Solución:**
1. Reinicia servidor: `Ctrl+C` → `npm run dev`
2. Limpia cache: `rm -rf node_modules/.astro` (Linux/macOS) o `rmdir /s /q node_modules\.astro` (Windows)
3. Reinstala: `npm install`

---

## 📊 Performance y Optimización

### Lighthouse Audits

Verificar rendimiento localmente:

```bash
npm run build
npm start
# Luego abrir DevTools → Lighthouse
```

### Optimizaciones Incluidas

- ✅ Code splitting automático
- ✅ Image optimization con Astro
- ✅ CSS purging con Tailwind
- ✅ Tree shaking de dependencias
- ✅ Minificación automática

---

## 🔐 Seguridad

### CORS y API Calls

Todas las llamadas al backend deben usar la URL configurada en `.env`:

```typescript
// src/lib/api.ts
const API_URL = import.meta.env.PUBLIC_API_URL;

export async function fetchData(endpoint: string) {
  const response = await fetch(`${API_URL}${endpoint}`);
  return response.json();
}
```

### Environment Variables

**NUNCA hardcodees credenciales:**

❌ **Malo:**
```typescript
const API_URL = "http://localhost:8001";
const SECRET_KEY = "hardcoded-secret";
```

✅ **Correcto:**
```typescript
const API_URL = import.meta.env.PUBLIC_API_URL;
// Secretos NO van en el frontend (siempre en backend)
```

---

## 📝 Desarrollo de Componentes

### Crear un Componente Astro

```astro
---
// src/components/MiComponente.astro

interface Props {
  titulo: string;
  contenido: string;
}

const { titulo, contenido } = Astro.props;
---

<div class="bg-white p-4 rounded-lg shadow">
  <h2 class="text-xl font-bold">{titulo}</h2>
  <p class="text-gray-600">{contenido}</p>
</div>

<style>
  /* CSS local al componente */
  div {
    transition: all 0.3s ease;
  }
  div:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
</style>
```

### Usar el Componente

```astro
---
import MiComponente from '../components/MiComponente.astro';
---

<MiComponente 
  titulo="Hola" 
  contenido="Contenido del componente"
/>
```

---

## 🔗 Integración con Backend

### Llamadas a API

```typescript
// src/lib/api.ts
export async function getExpedientes(fincaId: string) {
  const res = await fetch(
    `${import.meta.env.PUBLIC_API_URL}/api/v1/expedientes/${fincaId}`
  );
  
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}
```

### En Componentes

```astro
---
import { getExpedientes } from '../lib/api';

const expedientes = await getExpedientes(fincaId);
---

<ul>
  {expedientes.map((exp) => (
    <li>{exp.id}: {exp.estado}</li>
  ))}
</ul>
```

---

## 📞 Contacto y Soporte

### Logs y Debugging

**Servidor de desarrollo:**
```bash
npm run dev
# Los logs aparecen en la terminal

# Browser Console (F12)
console.log("Debug info");
```

**Build:**
```bash
npm run build
# Muestra warnings y errores de compilación
```

**Producción (Render):**
- Dashboard de Render → Logs
- Busca errores en tiempo real

---

## 🎓 Recursos Adicionales

- [Documentación de Astro](https://docs.astro.build)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Leaflet Maps](https://leafletjs.com)
- [Supabase Docs](https://supabase.com/docs)

---

**Versión:** 1.0  
**Última actualización:** 2026-07-30  
**Node.js:** >= 22.12.0  
**Framework:** Astro 6.4.7
