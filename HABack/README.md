# HABack — backend (Pants)

Microservicios Python del monorepo **HuellaAltura**.

| Paquete | Puerto | Rol |
|---------|--------|-----|
| `auth-service` | 8000 | Identidad, JWT, RBAC |
| `exped-service` | 8031 | EUDR, fincas, acopio |

## Comandos

```bash
pants run HABack/auth-service:ci
pants run HABack/exped-service:ci
npm run ci:haback
npm run ci:haback:direct   # sin Pants
```

Layout: `auth-service/` y `exped-service/` con `BUILD` + `pants_ci.sh`.
