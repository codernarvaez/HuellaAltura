# HAContract · módulo blockchain de Huella Altura

Implementación de las **fases 1 y 2** de `PLAN_MODULO_BLOCKCHAIN.md`: contratos de trazabilidad
del café para **Polygon** (Amoy `80002` para pruebas, PoS `137` en producción) con documentos en
**IPFS** fijados con **Pinata**. Parte del prototipo `Proyecto_Coffee` y corrige sus deudas
(PLAN §0.2): pesos en gramos, transferencias bloqueadas, metadatos por lote, contratos actualizables,
datos de fase fuera de storage y errores personalizados.

## Contratos

| Contrato | Papel |
| --- | --- |
| `access/HuellaAccess.sol` | Roles (`RELAYER`, `FARMER`, `PROCESSOR`, `GRADER`, `EXPORTER`, `AUDITOR`), pausa de emergencia y upgrades UUPS (solo `DEFAULT_ADMIN_ROLE`, que debe terminar en el Safe) |
| `CoffeeToken.sol` | ERC-1155 + Supply + URIStorage. Dos clases por el byte alto del id: `LOT` (amount = gramos) y `DDS_CERT` (amount = 1, intransferible). Solo los contratos con `CONTROLLER_ROLE` acuñan, queman o mueven saldos |
| `OriginRegistry.sol` | Fincas versionadas (`fincaId = keccak256(uuid)`, `geoHash = keccak256(GeoJSON)`), anclaje de auditorías de deforestación, emisión/revocación del DDS e `isCompliant` |
| `TraceabilityController.sol` | Ciclo del lote con puerta EUDR, transformaciones de forma, custodia, split/merge y linaje |
| `libraries/CoffeeTypes.sol` | Enums, struct `Lot` y codificación de ids |

Todos van detrás de proxies **UUPS (EIP-1967)** con `@openzeppelin/contracts-upgradeable` 5.

### Ciclo del lote

```
registerHarvest   HARVESTED  CHERRY     mint id nuevo (gramos)   solo si la finca tiene DDS vigente
logProcessing     PROCESSED  CHERRY     mismo id
logDrying         DRIED      PARCHMENT  burn + mint id nuevo     HighMoistureWarning si humedad > 12,5 %
logHulling        HULLED     GREEN      burn + mint id nuevo     gramsOut/gramsIn = factor de rendimiento
addCupping        GRADED     GREEN      mismo id                 SCA 0–100
split             PACKAGED   GREEN      ids hijos (sacos)        la suma sale exacta del saldo
merge             PACKAGED   GREEN      id nuevo                 suma de los saldos; origen por linaje
markExported      EXPORTED   GREEN      mismo id                 referencia DDS/TRACES
transferCustody   (cualquiera salvo EXPORTED)                    la firma el custodio o el relayer
```

Cada id guarda sus padres (`lineage`), así que desde el lote exportado se recorre el árbol hasta la
cereza, su finca (versión del polígono) y el DDS con el que nació. Los datos de cada fase no se
guardan en storage: se emiten como `keccak256(JSON canónico)` + CID en los eventos.

Convenciones: masa en gramos, área en hectáreas × 100, pH × 10, humedad × 10, variedad como
`bytes32`. Las funciones reciben el CID **sin** prefijo; `uri(id)` devuelve `ipfs://<cid>`.

## Documentos off-chain

`schemas/` tiene los JSON Schema `lot/v1`, `dds/v1` y `finca/v1` (PLAN §3.5). `scripts/lib/documents.ts`
valida cada documento, rechaza claves personales (cédula, nombres, teléfono, correo, dirección,
firma…), lo serializa en forma canónica y calcula su `keccak256`. `scripts/lib/ipfs.ts` sube esos
mismos bytes a Pinata, de modo que el hash on-chain corresponde exactamente al archivo en IPFS. En
producción esta lógica pasa al `HABack/chain-service` (Fase 3).

## Uso

```bash
cd HAContract
npm install
cp .env.example .env        # ver la tabla de secretos

npm run lint                # solhint
npm test                    # 49 pruebas
npm run coverage            # 100 % de líneas, ~99 % de ramas
npm run test:gas            # reporte de gas por función

# Local
npm run node                # en otra terminal
npm run deploy:local
npm run demo:local          # flujo completo; sin PINATA_JWT calcula los CID sin fijarlos

# Polygon Amoy
npm run deploy:amoy         # proxies + roles → deployments/80002.json (direcciones y ABI)
npm run demo:amoy           # finca → DDS → cosecha → … → exportación, con documentos en Pinata
npm run verify:amoy         # código verificado en amoy.polygonscan.com
CONTRACT=TraceabilityController npm run upgrade:amoy
RELAYER_ADDRESS=0x… npm run roles:amoy
```

### Una cuenta por rol

Para probar cada fase firmada por su actor (en vez del relayer):

```bash
npm run accounts:local      # da cada rol a las cuentas públicas de Hardhat #1–#6 y las lista con su clave
npm run demo:roles:local    # el mismo flujo, firmado por relayer, auditor, agricultor, beneficio, catador y exportador
```

En Amoy, crea seis cuentas de prueba en Rabby, pon sus claves en `RELAYER_PRIVATE_KEY`,
`AUDITOR_PRIVATE_KEY`, `FARMER_PRIVATE_KEY`, `PROCESSOR_PRIVATE_KEY`, `GRADER_PRIVATE_KEY` y
`EXPORTER_PRIVATE_KEY` y ejecuta `npm run accounts:amoy` (concede los roles y envía `ROLE_FUND_POL`
a cada cuenta desde el desplegador) y luego `npm run demo:roles:amoy`.

`deploy:amoy` también escribe `.openzeppelin/` con el layout de storage de cada implementación:
hay que subirlo al repo junto con `deployments/80002.json`, porque los upgrades lo necesitan.

### Secretos (`.env`, nunca en git)

| Variable | Para qué |
| --- | --- |
| `DEPLOYER_PRIVATE_KEY` | Cuenta que despliega; en la demo actúa como relayer. Fondos: https://faucet.polygon.technology |
| `AMOY_RPC_URL` | RPC de Amoy (Alchemy/QuickNode/Infura). Vacío = publicnode |
| `PINATA_JWT` / `PINATA_GATEWAY` | Fijar y leer documentos en IPFS |
| `RELAYER_ADDRESS` | Opcional: cuenta del chain-service con roles operativos |
| `SAFE_ADDRESS` | Opcional: el Safe pasa a ser el único admin y el desplegador renuncia |
| `ETHERSCAN_API_KEY` | Opcional: verificación en Polygonscan (API v2) |

## Qué queda para las siguientes fases del plan

- Fase 0: ADR-001/002, Safe multisig en Amoy, cuentas de Pinata/RPC del proyecto.
- Fase 1: integrar `HAContract` en los workspaces de Turborepo (se dejó aparte para no tocar el
  `package-lock.json` raíz) y añadir `slither` al CI.
- Fase 2: el despliegue usa `upgrades.deployProxy` en un script en lugar de Hardhat Ignition, porque
  así el plugin valida el layout de storage de cada upgrade.
- Fases 3–7: `chain-service` (outbox, nonce, indexador), integración con `exped-service`,
  pantallas en HAFront/HAMobile, verificación pública por QR y paso a mainnet.
