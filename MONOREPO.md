# Monorepo HuellaAltura

Orquestador único: **Pants**. Los workspaces npm solo gestionan dependencias JS.

| Paquete | Stack | CI |
|---------|-------|-----|
| **HABack** | FastAPI + Prisma | `pants run HABack/*/…:ci` |
| **HAFront** | Astro 6 | `pants run HAFront:ci` |
| **HAMobile** | Expo | `pants run HAMobile:ci` |
| HAContract | WIP | — |

## Comandos

```bash
# Instalar Pants
curl --proto '=https' --tlsv1.2 -fsSL https://static.pantsbuild.org/setup/get-pants.sh | bash

npm ci

pants list ::
pants run HAFront:ci
pants run HAMobile:ci
pants run HABack/auth-service:ci
pants run HABack/exped-service:ci

# Atajos npm (workspaces, sin Turbo)
npm run ci:hafront
npm run ci:hamobile
npm run ci:haback
```

## Estructura

```
HuellaAltura/
  pants.toml
  HABack/     # Python — Pants + pants_ci.sh
  HAFront/    # Astro  — npm workspace + Pants
  HAMobile/   # Expo   — npm workspace + Pants
```
