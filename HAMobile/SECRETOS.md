# Gestión de secretos de HAMobile

Los tokens **no se versionan**. `eas.json` solo contiene URLs públicas de API;
todo lo demás se carga como EAS Secret y EAS lo inyecta en el build.

## Variables requeridas

| Variable | Tipo | Dónde vive | Notas |
|---|---|---|---|
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Runtime, va dentro del APK | EAS Secret | **Debe ser un token público `pk.`**, nunca `sk.` |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | Build-time | EAS Secret | Token `sk.` con el scope `DOWNLOADS:READ` y ningún otro |

## Cargarlas

```bash
eas secret:create --scope project --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN --value "pk.xxxxx"
eas secret:create --scope project --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value "sk.xxxxx"
eas secret:list
```

Para desarrollo local, un `.env` en la raíz de `HAMobile/` (ya está en
`.gitignore`) con las mismas variables.

## Por qué se sacaron del repositorio

`eas.json` contenía, versionado y en texto plano:

- **`EXPO_PUBLIC_CLOUDINARY_API_SECRET`, `_API_KEY` y `_CLOUD_NAME`** — eliminadas
  por completo. Ningún archivo del código móvil las usaba: Cloudinary solo se
  consume desde `exped-service`. Eran fuga de credenciales sin ninguna función.
- **Un token Mapbox `sk.`** usado a la vez como token de runtime y de descarga.
  El prefijo `EXPO_PUBLIC_` hace que Expo lo **empaquete dentro del APK**, así
  que un token secreto quedaba al alcance de cualquiera que descomprimiera la
  app. El token de runtime debe ser `pk.`, restringido por scope.

## Pendiente: rotación

Ambas credenciales siguen en el historial de git, por lo que **quitarlas del
archivo no las invalida**. Hay que rotarlas manualmente:

1. Cloudinary → *Settings › Access Keys* → regenerar el API Secret.
2. Mapbox → *Account › Tokens* → revocar el token `sk.` comprometido y crear
   uno `pk.` para runtime y otro `sk.` solo-descargas para el build.
