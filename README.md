# ☕ Sistema de Trazabilidad de Café de Especialidad (ISO 22005 & Polygon Blockchain)

Ecosistema digital descentralizado diseñado para garantizar la transparencia, inmutabilidad y cumplimiento estricto de la norma internacional **ISO 22005:2007** (Trazabilidad de la cadena alimentaria) en la producción, transformación y comercialización de café de altura.

---

## 🏗️ Arquitectura General y Estructura del Monorepo

Este proyecto adopta un enfoque de **Monorepo** para centralizar la gobernanza del código, unificar los ciclos de lanzamiento (*releases*) y garantizar la consistencia en los contratos de datos (APIs).

```text
mi-proyecto-trazabilidad/
├── .github/                  # Flujos de trabajo automatizados (GitHub Actions CI/CD)
│   └── workflows/            # Scripts de pruebas y despliegue por componentes
├── backend/                  # API REST principal (FastAPI + Supabase ORM)
│   ├── app/
│   │   ├── api/              # Endpoints (Lotes, Productores, Blockchain)
│   │   ├── core/             # Seguridad, hashing criptográfico y config
│   │   └── models/           # Esquemas de base de datos PostgreSQL
│   ├── .env.example
│   └── requirements.txt
├── frontend/                 # Plataforma Web Administrativa y Landing del Consumidor (Astro)
│   ├── src/
│   │   ├── components/       # Componentes UI (Gráficos de trazabilidad, Visor QR)
│   │   └── pages/            # Rutas de la app y landing optimizada (SSG/SSR)
│   ├── package.json
│   └── astro.config.mjs
├── mobile/                   # Aplicación Móvil para Operadores de Campo y Productores
│   ├── src/                  # Captura de datos sin conexión, geolocalización y escáner
│   └── package.json
├── blockchain/               # Entorno de Contratos Inteligentes (Solidity)
│   ├── contracts/            # Smart Contracts (Trazabilidad.sol basados en ERC-1155)
│   ├── scripts/              # Scripts de despliegue en redes de prueba/producción
│   └── hardhat.config.js     # Configuración del entorno de desarrollo EVM
└── shared/                   # Especificaciones de negocio, documentación ISO y esquemas JSON
