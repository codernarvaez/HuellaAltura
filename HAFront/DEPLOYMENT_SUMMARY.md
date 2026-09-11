# ✅ Resumen: Scripts de Despliegue Frontend

**Fecha:** 2026-07-30  
**Estado:** Completado ✅  
**Framework:** Astro 6.4.7 + Tailwind CSS + TypeScript

---

## 🎯 Qué Se Hizo

Se creó una estructura profesional de scripts para ejecutar, desarrollar y desplegar el frontend Astro con documentación completa.

### Estructura Creada

```
HAFront/
├── deployment_scripts/
│   ├── README.md                          ← ⭐ LEER PRIMERO
│   ├── scripts/                           # Bash (Linux/macOS)
│   │   ├── install_dependencies.sh
│   │   ├── start_dev.sh
│   │   ├── build.sh
│   │   ├── start_production.sh
│   │   └── check.sh
│   └── windows/                           # PowerShell (Windows)
│       ├── install_dependencies.ps1
│       ├── start_dev.ps1
│       ├── build.ps1
│       └── start_production.ps1
├── render.yaml                            # Config CI/CD para Render
└── DEPLOYMENT_SUMMARY.md                  # Este archivo
```

---

## 🚀 Inicio Rápido

### Windows (PowerShell)

```powershell
cd HAFront

# Primera vez
.\deployment_scripts\windows\install_dependencies.ps1

# Desarrollar
.\deployment_scripts\windows\start_dev.ps1
# Accede a: http://localhost:3000

# Compilar para producción
.\deployment_scripts\windows\build.ps1

# Probar build compilado
.\deployment_scripts\windows\start_production.ps1
```

### Linux / macOS (Bash)

```bash
cd HAFront

# Primera vez
bash deployment_scripts/scripts/install_dependencies.sh

# Desarrollar
bash deployment_scripts/scripts/start_dev.sh
# Accede a: http://localhost:3000

# Compilar para producción
bash deployment_scripts/scripts/build.sh

# Probar build compilado
bash deployment_scripts/scripts/start_production.sh
```

---

## 📚 Scripts Disponibles

### Linux/macOS (Bash)

| Script | Propósito | Desarrollo | Producción |
|--------|-----------|------------|-----------|
| `install_dependencies.sh` | Instala Node + npm | ✅ | ✅ |
| `start_dev.sh` | Servidor con hot reload | ✅ | ❌ |
| `build.sh` | Compila optimizado | ✅ | ✅ |
| `start_production.sh` | Inicia build compilado | ✅ | ✅ |
| `check.sh` | Verifica tipos TS | ✅ | ✅ |

### Windows (PowerShell)

| Script | Propósito | Desarrollo | Producción |
|--------|-----------|------------|-----------|
| `install_dependencies.ps1` | Instala Node + npm | ✅ | ✅ |
| `start_dev.ps1` | Servidor con hot reload | ✅ | ❌ |
| `build.ps1` | Compila optimizado | ✅ | ✅ |
| `start_production.ps1` | Inicia build compilado | ✅ | ✅ |

---

## 🔄 Flujos Principales

### 1. Desarrollo Local

```bash
bash deployment_scripts/scripts/start_dev.sh
# http://localhost:3000 con hot reload automático
```

**Características:**
- ✅ Recarga automática en cambios
- ✅ TypeScript compilado en tiempo real
- ✅ Tailwind CSS actualizado
- ✅ Errores mostrados en consola

### 2. Compilación para Producción

```bash
bash deployment_scripts/scripts/build.sh
# Genera: dist/ (optimizado y minificado)
```

**Qué sucede:**
1. Verifica tipos TypeScript
2. Optimiza todos los assets
3. Minifica CSS y JavaScript
4. Tree shaking automático
5. Genera `dist/` lista para desplegar

### 3. Probar Compilado Localmente

```bash
bash deployment_scripts/scripts/build.sh
bash deployment_scripts/scripts/start_production.sh
# http://localhost:3000 (versión compilada)
```

### 4. Verificar Código

```bash
bash deployment_scripts/scripts/check.sh
# Verifica tipos TypeScript y linting
```

---

## 🌍 Requisitos

**Obligatorio:**
- Node.js >= 22.12.0
- npm >= 10.x
- Git

**Verificar:**
```bash
node --version
npm --version
```

---

## 📝 Variables de Entorno

Crear archivo `.env` en `HAFront/`:

```env
# Backend API
PUBLIC_API_URL=http://localhost:8001

# Para producción (Render)
PUBLIC_API_URL=https://tu-api-render.onrender.com

# Supabase (si lo usas)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

**Nota:** No incluir `.env` en Git (ver `.gitignore`)

---

## 🚀 Despliegue en Render

### Opción 1: Automático (Recomendado)

1. Conectar GitHub a Render
2. Crear nuevo Web Service
3. Configurar:
   - **Build:** `cd HAFront && npm install && npm run build`
   - **Start:** `npm start`
   - **Environment:** `PUBLIC_API_URL`, etc.
4. Deploy automático en cada push a `main`

### Opción 2: Manual

```bash
git add dist/
git commit -m "Deploy frontend"
git push
# Render detecta cambios y redeploya
```

### Usar render.yaml

Render detecta automáticamente `render.yaml` en raíz del proyecto.

---

## 🔍 Troubleshooting

| Problema | Solución |
|----------|----------|
| "Node not found" | Instala Node.js 22.12.0+ |
| "npm: command not found" | Reinstala Node.js completo |
| "Could not find Astro" | Ejecuta `npm install` |
| "Port 3000 already in use" | Mata proceso o usa otro puerto |
| "dist/ not found" | Ejecuta `npm run build` primero |
| "Hot reload no funciona" | Reinicia: `Ctrl+C` → `npm run dev` |

---

## 📊 Estructura del Proyecto

```
HAFront/
├── src/
│   ├── pages/              # Rutas (cada archivo = una ruta)
│   ├── components/         # Componentes reutilizables
│   ├── layouts/           # Layouts base
│   ├── lib/              # Funciones/utilitarios
│   └── styles/           # CSS global
├── public/               # Archivos estáticos (no procesados)
├── deployment_scripts/   # ⭐ Scripts de despliegue
├── dist/                 # Build compilado (generado)
├── package.json
├── astro.config.mjs
└── tsconfig.json
```

---

## 💡 Tips y Mejores Prácticas

### Desarrollo Eficiente

```bash
# Mantén dos terminales abiertas
# Terminal 1: Servidor de desarrollo
npm run dev

# Terminal 2: Ver cambios, linting, etc.
npm run check
```

### Antes de Commitear

```bash
# Verificar que no hay errores
npm run check

# Hacer build local para probar
npm run build && npm start
```

### Optimizaciones

- ✅ Usa componentes Astro en lugar de archivos HTML
- ✅ Importa tipos con `import type` para tree shaking
- ✅ Lazy load componentes pesados
- ✅ Optimiza imágenes con componente `<Image/>` de Astro

---

## 📞 Comandos npm Directos

Si prefieres no usar los scripts:

```bash
npm install              # Instalar dependencias
npm run dev             # Desarrollo
npm run build           # Compilar
npm start              # Producción (requiere build)
npm run check          # Verificar tipos
npm run lint           # Linter
npm run preview        # Preview de build (legacy)
```

---

## 🎓 Próximos Pasos

1. **Leer:** `deployment_scripts/README.md` (documentation completa)
2. **Clonar:** El proyecto
3. **Instalar:** `.\deployment_scripts\windows\install_dependencies.ps1` (Windows)
4. **Desarrollar:** `npm run dev`
5. **Commitear:** `git add . && git commit -m "mi cambio"`
6. **Desplegar:** Push a GitHub → Render redeploy automático

---

## 🔗 Recursos

- [Astro Docs](https://docs.astro.build)
- [Tailwind CSS](https://tailwindcss.com)
- [Leaflet Maps](https://leafletjs.com)
- [Supabase](https://supabase.com)
- [Render Deploy](https://render.com)

---

**Versión:** 1.0  
**Última actualización:** 2026-07-30  
**Framework:** Astro 6.4.7  
**CSS:** Tailwind 4.3.0  
**Runtime:** Node.js >= 22.12.0

Para más detalles, leer `deployment_scripts/README.md` ⭐
