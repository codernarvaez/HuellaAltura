# HABack — backend (Pants)

Microservicios Python del monorepo **HuellaAltura**.

| Paquete | Puerto | Rol |
|---------|--------|-----|
| `auth-service` | 8000 | Identidad, JWT, RBAC |
| `exped-service` | 8031 | EUDR, fincas, acopio |
| `sender-service` | 8040 | Correos transaccionales (Resend / httpx) |
| `bcregister-service` | 8050 | Notario Polygon + notificación opcional |

## Comandos

```bash
pants run HABack/auth-service:ci
pants run HABack/exped-service:ci
pants run HABack/sender-service:ci
pants run HABack/bcregister-service:ci
npm run ci:haback
npm run ci:haback:bcregister
npm run ci:haback:direct   # sin Pants
```

Layout: cada servicio con `BUILD` + `pants_ci.sh`. Blueprint Render: `HABack/render.yaml`.
