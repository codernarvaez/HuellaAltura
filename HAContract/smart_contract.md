# Pipeline de trazabilidad on-chain (v1)

Qué información de cada lote de café se escribe en blockchain, en qué orden y con qué reglas.
Combina el Módulo 1 de Huella de Altura (Finca → Expediente → Auditoría GEE → Certificado DDS) con el
modelo de producción de [SGTC-Trazabilidad](https://github.com/GerardoHerr/SGTC-Trazabilidad)
(Parcela → Lote → Semilla → 8 fases con trabajadores asignados).

- Definición legible por máquina (etapas, campos, reglas, hashing): `HAFront/src/lib/trazabilidad/pipeline.ts`.
  Las tablas de la §4 se generaron desde ese archivo; si cambia uno, actualizar el otro.
- Vista: `/trazabilidad` en HAFront (por ahora con el lote de demostración `HAFront/src/lib/trazabilidad/demo.ts`).
- Red objetivo: Polygon Amoy (testnet) y luego Polygon PoS. Token ERC-1155, como indica el README.

## 1. Qué va on-chain y qué no

Una blockchain pública es permanente y replicada: lo que se escribe no se puede borrar. Por eso el
contrato solo recibe hashes y metadatos no personales (LOPDP Ecuador / RGPD: el derecho de supresión no
se puede cumplir on-chain). La geolocalización exacta de la finca la exige el EUDR ante la autoridad
(TRACES), no ante el público, así que tampoco se publica en claro.

| Nivel | Dónde vive | Contenido | Ejemplo |
|---|---|---|---|
| **On-chain** | Contrato (storage + evento) | Registro genérico por etapa: `loteId`, `etapa`, `dataHash`, `prevHash`, fechas, `cantidadG`, `actor` | `cantidadG = 1250000` (1 250 kg de pergamino seco) |
| **Payload público** | BD de exped-service y, opcionalmente, IPFS (`uri`) | Datos de la etapa sin datos personales. Su keccak256 es el `dataHash` | variedad, altitud, humedad final, resultado GEE, código DDS |
| **Privado** | Solo BD | Datos personales y geodatos exactos. En el payload va únicamente su compromiso (`privado_commit`) | cédula y teléfono de trabajadores, polígono GeoJSON |

## 2. Etapas

Cada lote tiene una cadena de 11 registros. Solo se escribe una etapa cuando está **Completada**
(EstadoFase de SGTC), y siempre en orden: el contrato rechaza saltos.

| # | Etapa | Origen del dato | Firma | `cantidadG` |
|---|---|---|---|---|
| 0 | `ORIGEN` | Finca (HA) + Parcela y Lote (SGTC). Acuña el token | OPERADOR | — |
| 1 | `CUMPLIMIENTO_EUDR` | Auditoría GEE + Certificado DDS (HA) | AUDITOR | — |
| 2 | `SEMILLA` | Semilla (SGTC, `iniciar-etapa`) | OPERADOR | — |
| 3 | `SEMBRADO` | LoteFase orden 1 (SGTC) | OPERADOR | — |
| 4 | `COSECHA` | LoteFase orden 2 | OPERADOR | cereza |
| 5 | `DESPULPADO` | LoteFase orden 3 | OPERADOR | pergamino húmedo |
| 6 | `SECADO` | LoteFase orden 4 | OPERADOR | pergamino seco |
| 7 | `TOSTADO` | LoteFase orden 5 | OPERADOR | tostado |
| 8 | `MOLIDO` | LoteFase orden 6 | OPERADOR | molido |
| 9 | `EMPAQUETADO` | LoteFase orden 7 | OPERADOR | empacado |
| 10 | `TRANSPORTE` | LoteFase orden 8 | OPERADOR | despachado |

`EstadoLote` de SGTC se deriva de la cadena: `Creado` tras `ORIGEN`, `En Producción` tras `SEMILLA`,
`Completado` tras `TRANSPORTE`. `Archivado` es solo off-chain.

`EUDR` va antes de `SEMILLA` a propósito: no se acuña producción de una finca sin auditoría GEE aprobada y DDS vigente.

## 3. Registro on-chain

**Identificadores**

- `loteId = keccak256(utf8("{tenant}:{codigo_lote}"))`, p. ej. `keccak256("APECAEL:AHU-P01-L1")`. El código de lote es el de SGTC: `{parcela.codigo}-L{n}`.
- `tokenId = uint256(loteId)`. Se acuña 1 unidad al titular en `ORIGEN`: es el pasaporte digital del lote.

**Campos por etapa**

| Campo | Tipo | Origen |
|---|---|---|
| `etapa` | `uint8` (enum) | índice de la §2 |
| `dataHash` | `bytes32` | `keccak256(JSON canónico del payload)` (§5) |
| `prevHash` | `bytes32` | `recordHash` de la etapa anterior; `0x0` en `ORIGEN` |
| `fechaInicio` | `uint64` | unix s. `LoteFase.fecha_inicio`; en `ORIGEN` `Lote.fecha_creacion`; en `EUDR` `Auditoria.fecha_auditoria` |
| `fechaFin` | `uint64` | unix s. `LoteFase.fecha_fin`; en `EUDR` `Certificado.fecha_emision` |
| `cantidadG` | `uint64` | masa de salida en gramos (0 si la etapa no mueve masa) |
| `actor` | `address` | `msg.sender` |
| `registradoEn` | `uint64` | `block.timestamp` |
| `uri` | `string` (solo evento) | ubicación del payload público, p. ej. `ipfs://…` (el repo ya reserva `PINATA_JWT`) |

**Encadenamiento**

```
recordHash = keccak256(abi.encode(loteId, uint8(etapa), dataHash, prevHash, fechaInicio, fechaFin, cantidadG))
```

El contrato calcula `recordHash` y lo emite; el backend lo calcula antes de enviar la transacción y
lo compara con el evento. Alterar cualquier etapa pasada cambia su `recordHash` y rompe todos los
`prevHash` posteriores.

## 4. Payload por etapa

Sobre común (lo que se hashea):

```json
{
  "schema": "huella.trazabilidad/v1",
  "lote": "AHU-P01-L1",
  "etapa": "SECADO",
  "datos": { "...campos públicos de la etapa..." },
  "privado_commit": "0x…"
}
```

Las fechas y la masa **no** van en `datos`: ya están en el registro on-chain. `privado_commit` se omite si la etapa no tiene campos privados.
Fuente: **HuellaAltura** = existe hoy en exped-service; **SGTC** = existe en SGTC-Trazabilidad; **Propuesto** = campo nuevo que hay que crear.

### 4.1 Campos de trabajadores (fases 3–10)

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `trabajadores_total` | público | SGTC | count(TrabajadorLoteFase) |
| `trabajadores_por_rol` | público | SGTC | Personal.rol agrupado, p. ej. `{"Recolector": 5, "Supervisor": 1}` |
| `trabajadores` | **privado** | SGTC | Personal.nombres, apellidos, identificacion, telefono |

### 4.2 `ORIGEN` (etapa 0)

Finca, parcela y lote de donde proviene el café. Firma: `OPERADOR_ROLE`. Disparador: `POST /lotes (SGTC crear_lotes) → registrarLote()`. No mueve masa (`cantidadG = 0`).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `tenant` | público | HuellaAltura | Expediente.organizacion_inquilino |
| `finca_eudr_id` | público | HuellaAltura | Finca.eudr_id |
| `finca_nombre` | público | HuellaAltura | Finca.nombre |
| `provincia` | público | HuellaAltura | Finca.provincia |
| `canton` | público | HuellaAltura | Finca.canton |
| `parroquia` | público | HuellaAltura | Finca.parroquia |
| `tenencia` | público | HuellaAltura | Finca.tenencia |
| `area_total_ha` (ha) | público | HuellaAltura | Finca.area_total_ha |
| `centroide` | público | HuellaAltura | Finca.latitud/longitud redondeadas a 2 decimales |
| `poligono_hash` | público | HuellaAltura | keccak256(JSON canónico de Finca.poligono) |
| `parcela_codigo` | público | SGTC | Parcela.codigo |
| `tipo_terreno` | público | SGTC | Parcela.tipo_terreno |
| `altitud_msnm` (msnm) | público | SGTC | Parcela.altitud_msnm |
| `ph_suelo` | público | SGTC | Parcela.ph_suelo |
| `textura` | público | SGTC | Parcela.textura |
| `orientacion_ladera` | público | SGTC | Parcela.orientacion_ladera |
| `cortinas_rompevientos` | público | SGTC | Parcela.cortinas_rompevientos |
| `lote_codigo` | público | SGTC | Lote.codigo ({parcela}-L{n}) |
| `hectareas_asignadas` (ha) | público | SGTC | Lote.hectareas_asignadas |
| `tipo_zona` | público | SGTC | Lote.tipo_zona |
| `poligono` | **privado** | HuellaAltura | Finca.poligono |
| `coordenadas` | **privado** | HuellaAltura | Finca.latitud, Finca.longitud |
| `productor_id` | **privado** | HuellaAltura | Finca.usuario_id (auth-service) |

Reglas: La finca tiene EUDR ID asignado (backend); Terreno regular: el lote tiene al menos 1 ha (backend); El lote no existía on-chain (loteId único) (contrato).

### 4.3 `CUMPLIMIENTO_EUDR` (etapa 1)

Auditoría satelital sin deforestación desde el 31/12/2020 y certificado de debida diligencia (DDS) de la finca. Firma: `AUDITOR_ROLE`. Disparador: `POST /certificados (DDS emitido) → registrarEtapa()`. No mueve masa (`cantidadG = 0`).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `expediente_estado` | público | HuellaAltura | Expediente.estado |
| `gee_resultado` | público | HuellaAltura | Auditoria.resultado |
| `deforestacion_detectada` | público | HuellaAltura | Auditoria.deforestacion_detectada |
| `fecha_corte` | público | HuellaAltura | Auditoria.fecha_corte |
| `fuente_satelital` | público | HuellaAltura | Auditoria.fuente |
| `dds_codigo` | público | HuellaAltura | Certificado.codigo_certificado |
| `dds_estado` | público | HuellaAltura | Certificado.estado |
| `dds_vencimiento` | público | HuellaAltura | Certificado.fecha_vencimiento |
| `dds_documento_hash` | público | Propuesto | SHA-256 del archivo en Certificado.url_documento |
| `total_stock_carbono` (tC/ha) | público | HuellaAltura | Dato.total_stock_carbono |
| `cobertura_forestal` | público | HuellaAltura | Dato.cobertura_forestal |
| `auditor_id` | **privado** | HuellaAltura | Auditoria.ejecutado_por / Certificado.generado_por |
| `observaciones` | **privado** | HuellaAltura | Auditoria.observaciones |

Reglas: Auditoría satelital aprobada, sin deforestación (backend); Fecha de corte: 31/12/2020 (backend); Certificado DDS vigente (backend); Firmado por una wallet con AUDITOR_ROLE (contrato).

### 4.4 `SEMILLA` (etapa 2)

Material de siembra asignado al lote al iniciar la producción. Firma: `OPERADOR_ROLE`. Disparador: `POST /lotes/{id}/iniciar-etapa (SGTC) → registrarEtapa()`. No mueve masa (`cantidadG = 0`).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `variedad` | público | SGTC | Semilla.variedad |
| `origen` | público | SGTC | Semilla.origen |
| `distribuidor` | público | SGTC | Semilla.distribuidor |
| `metodo_secado` | público | SGTC | Semilla.metodo_secado |
| `seleccion` | público | SGTC | Semilla.seleccion |
| `olor` | público | SGTC | Semilla.olor |
| `color` | público | SGTC | Semilla.color |
| `integridad_pergamino` | público | SGTC | Semilla.integridad_pergamino |
| `anexo_hash` | público | SGTC | SHA-256 del archivo en Semilla.anexo_ruta |

Reglas: El lote estaba recién creado (backend); Variedad de semilla registrada (backend).

### 4.5 `SEMBRADO` (etapa 3)

Siembra de las plantas en el lote. Firma: `OPERADOR_ROLE`. Disparador: `LoteFase(Sembrado).estado = Completada → registrarEtapa()`. No mueve masa (`cantidadG = 0`).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `plantas_sembradas` | público | Propuesto | Nuevo campo en LoteFase |
| `densidad_plantas_ha` (plantas/ha) | público | Propuesto | plantas_sembradas / Lote.hectareas_asignadas |

Más los campos de trabajadores (§4.1).

Reglas: Al menos un agricultor asignado (backend).

### 4.6 `COSECHA` (etapa 4)

Recolección de cereza madura. Firma: `OPERADOR_ROLE`. Disparador: `LoteFase(Cosecha).estado = Completada → registrarEtapa()`. `cantidadG` = cereza cosechada (g).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `tipo_cosecha` | público | Propuesto | Nuevo campo en LoteFase |
| `pases` | público | Propuesto | Nuevo campo en LoteFase |
| `madurez_pct` (%) | público | Propuesto | Nuevo campo en LoteFase |

Más los campos de trabajadores (§4.1).

### 4.7 `DESPULPADO` (etapa 5)

Retiro de pulpa y fermentación. Firma: `OPERADOR_ROLE`. Disparador: `LoteFase(Despulpado).estado = Completada → registrarEtapa()`. `cantidadG` = pergamino húmedo (g).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `kg_entrada` (kg) | público | Propuesto | cantidad de la etapa anterior |
| `proceso` | público | Propuesto | Nuevo campo en LoteFase |
| `horas_fermentacion` (h) | público | Propuesto | Nuevo campo en LoteFase |

Más los campos de trabajadores (§4.1).

### 4.8 `SECADO` (etapa 6)

Secado del pergamino hasta humedad de almacenamiento. Firma: `OPERADOR_ROLE`. Disparador: `LoteFase(Secado).estado = Completada → registrarEtapa()`. `cantidadG` = pergamino seco (g).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `kg_entrada` (kg) | público | Propuesto | cantidad de la etapa anterior |
| `metodo_secado` | público | SGTC | enum MetodoSecado |
| `humedad_final_pct` (%) | público | Propuesto | Nuevo campo en LoteFase |
| `dias_secado` (días) | público | Propuesto | Nuevo campo en LoteFase |

Más los campos de trabajadores (§4.1).

Reglas: Humedad final entre 10 % y 12 % (backend).

### 4.9 `TOSTADO` (etapa 7)

Tueste del café verde (tras la trilla del pergamino). Firma: `OPERADOR_ROLE`. Disparador: `LoteFase(Tostado).estado = Completada → registrarEtapa()`. `cantidadG` = café tostado (g).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `kg_verde_entrada` (kg) | público | Propuesto | Nuevo campo en LoteFase |
| `perfil_tueste` | público | Propuesto | Nuevo campo en LoteFase |
| `temperatura_final_c` (°C) | público | Propuesto | Nuevo campo en LoteFase |
| `tiempo_tueste_min` (min) | público | Propuesto | Nuevo campo en LoteFase |

Más los campos de trabajadores (§4.1).

### 4.10 `MOLIDO` (etapa 8)

Molienda (o grano entero) según presentación comercial. Firma: `OPERADOR_ROLE`. Disparador: `LoteFase(Molido).estado = Completada → registrarEtapa()`. `cantidadG` = café molido (g).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `tipo_molienda` | público | Propuesto | Nuevo campo en LoteFase |

Más los campos de trabajadores (§4.1).

### 4.11 `EMPAQUETADO` (etapa 9)

Unidades de venta; cada empaque lleva el QR del lote. Firma: `OPERADOR_ROLE`. Disparador: `LoteFase(Empaquetado).estado = Completada → registrarEtapa()`. `cantidadG` = café empacado (g).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `unidades` | público | Propuesto | Nuevo campo en LoteFase |
| `peso_neto_g` (g) | público | Propuesto | Nuevo campo en LoteFase |
| `tipo_empaque` | público | Propuesto | Nuevo campo en LoteFase |
| `consumo_preferente` | público | Propuesto | Nuevo campo en LoteFase |

Más los campos de trabajadores (§4.1).

Reglas: Unidades × peso neto = cantidad empacada (backend).

### 4.12 `TRANSPORTE` (etapa 10)

Despacho del café hacia el comprador. Firma: `OPERADOR_ROLE`. Disparador: `LoteFase(Transporte).estado = Completada → registrarEtapa()`. `cantidadG` = café despachado (g).

| Clave | Nivel | Fuente | Origen |
|---|---|---|---|
| `origen_despacho` | público | Propuesto | Nuevo campo en LoteFase |
| `destino_pais` | público | Propuesto | Nuevo campo en LoteFase (ISO 3166-1) |
| `medio` | público | Propuesto | Nuevo campo en LoteFase |
| `guia_remision_hash` | público | Propuesto | keccak256(número de guía) |
| `transportista` | **privado** | Propuesto | Nuevo registro |

Más los campos de trabajadores (§4.1).

Reglas: DDS vigente en la fecha de despacho (backend).

## 5. Hashing

- **JSON canónico** (RFC 8785 / JCS para los tipos usados): claves ordenadas, sin espacios, UTF-8 sin escapar, sin `NaN`/`Infinity`. Fechas como texto ISO 8601 (`"2020-12-31"`).
  Los enteros se serializan sin decimales: en Python, `3` y no `3.0` (`json.dumps(3.0)` produce `"3.0"` y cambia el hash).
- `dataHash = keccak256(utf8(canonical(payload)))`. Ojo: `hashlib.sha3_256` **no** es keccak256.
- `privado_commit = keccak256(utf8(sal + "|" + etapa + "|" + canonical(privado)))`. La sal es aleatoria (32 bytes) por lote, se guarda en BD y nunca se publica. Revelando sal y datos a un auditor se demuestra qué personas participaron sin exponerlas al público.
- `poligono_hash = keccak256(utf8(canonical(GeoJSON)))`. Hashes de archivos (anexo de semilla, PDF DDS): SHA-256 del archivo en hex con prefijo `0x`.

Equivalente en Python para exped-service (requiere `pycryptodome` y `eth-abi`):

```python
import json
from Crypto.Hash import keccak
from eth_abi import encode

def k256(data: bytes) -> str:
    return "0x" + keccak.new(digest_bits=256, data=data).hexdigest()

def canonical_json(obj) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

lote_id = k256(f"{tenant}:{codigo_lote}".encode())
data_hash = k256(canonical_json(payload).encode())
record_hash = k256(encode(
    ["bytes32", "uint8", "bytes32", "bytes32", "uint64", "uint64", "uint64"],
    [bytes.fromhex(lote_id[2:]), etapa, bytes.fromhex(data_hash[2:]), bytes.fromhex(prev_hash[2:]),
     fecha_inicio, fecha_fin, cantidad_g],
))
```

**Vector de prueba** (lote demo, etapa `SECADO`; verificado en TypeScript/viem y en Python):

| Entrada / salida | Valor |
|---|---|
| `loteId` | `0xfce131229c61fed86145d12701feed28236577515cbb322e6b0f612cc9d494cd` |
| JSON canónico | `{"datos":{"dias_secado":25,"humedad_final_pct":11,"kg_entrada":2700,"metodo_secado":"Secado lento a la sombra sobre camas africanas","trabajadores_por_rol":{"Operario":2},"trabajadores_total":2},"etapa":"SECADO","lote":"AHU-P01-L1","privado_commit":"0x0d8babc24cec453ece57ec0b7139dc7c891cefd28702c4944150d3dc0d161bc3","schema":"huella.trazabilidad/v1"}` |
| `dataHash` | `0xd67fca5d9a7f4a9d105f834f159b3583dd602e9b54b81427d718f910ddbe4664` |
| `prevHash` | `0x9be71a42f0ad0c9185345efdd610bc3decb18d1e8e22436e791090c60e1227f6` |
| `etapa`, `fechaInicio`, `fechaFin`, `cantidadG` | `6`, `1784570400`, `1786719600`, `1250000` |
| `recordHash` | `0x5b7f8a26f9fddba718bb7f9837c33a374db13bff8f5911d18a98fb4de816c6bb` |

## 6. Interfaz del contrato (borrador)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Implementación prevista: ERC1155 + AccessControl (OpenZeppelin).
interface IHuellaTrazabilidad {
    enum Etapa {
        ORIGEN, CUMPLIMIENTO_EUDR, SEMILLA,
        SEMBRADO, COSECHA, DESPULPADO, SECADO, TOSTADO, MOLIDO, EMPAQUETADO, TRANSPORTE
    }

    struct Registro {
        bytes32 dataHash;
        bytes32 prevHash;
        uint64 fechaInicio;
        uint64 fechaFin;
        uint64 cantidadG;
        uint64 registradoEn;
        address actor;
    }

    event LoteRegistrado(bytes32 indexed loteId, string codigoLote, address indexed titular);

    event EtapaRegistrada(
        bytes32 indexed loteId,
        Etapa indexed etapa,
        address indexed actor,
        bytes32 recordHash,
        bytes32 dataHash,
        bytes32 prevHash,
        uint64 fechaInicio,
        uint64 fechaFin,
        uint64 cantidadG,
        string uri
    );

    /// Acuña tokenId = uint256(loteId) al titular y registra ORIGEN. OPERADOR_ROLE.
    function registrarLote(
        bytes32 loteId,
        string calldata codigoLote,
        address titular,
        bytes32 dataHash,
        uint64 fecha,
        string calldata uri
    ) external;

    /// Registra la siguiente etapa. CUMPLIMIENTO_EUDR exige AUDITOR_ROLE; el resto OPERADOR_ROLE.
    function registrarEtapa(
        bytes32 loteId,
        Etapa etapa,
        bytes32 dataHash,
        uint64 fechaInicio,
        uint64 fechaFin,
        uint64 cantidadG,
        string calldata uri
    ) external;

    function registro(bytes32 loteId, Etapa etapa) external view returns (Registro memory);

    /// Número de etapas escritas; la siguiente etapa esperada es este valor.
    function etapasRegistradas(bytes32 loteId) external view returns (uint8);
}
```

## 7. Reglas de validación

**En el contrato** (revierte la transacción):

1. `registrarLote`: el `loteId` no existe. `registrarEtapa`: el lote existe y `uint8(etapa) == etapasRegistradas(loteId)` (orden estricto, sin duplicados).
2. `dataHash != 0`, `fechaFin >= fechaInicio` y `fechaInicio >= fechaInicio` de la etapa anterior.
3. Balance de masa: desde `COSECHA`, `cantidadG > 0` y `cantidadG <= cantidadG` de la última etapa con masa. La masa solo baja (cereza → pergamino → verde → tostado).
4. Roles: `AUDITOR_ROLE` para `CUMPLIMIENTO_EUDR`, `OPERADOR_ROLE` para el resto.

**En exped-service, antes de enviar la transacción** (el contrato no ve los datos):

- `ORIGEN`: la finca tiene `eudr_id`; en terreno Regular el lote tiene ≥ 1 ha (regla de SGTC).
- `CUMPLIMIENTO_EUDR`: `Auditoria.resultado = APROBADO`, `deforestacion_detectada = false`, `fecha_corte = 2020-12-31`, `Certificado.estado = VIGENTE`.
- `SEMILLA`: el lote estaba en `Creado` y la semilla tiene variedad (reglas de `iniciar-etapa` en SGTC).
- `SEMBRADO`: al menos un trabajador con rol `Agricultor` (regla de SGTC).
- `SECADO`: humedad final entre 10 % y 12 %.
- `EMPAQUETADO`: `unidades × peso_neto_g = cantidad`.
- `TRANSPORTE`: el DDS sigue vigente en la fecha de despacho.

## 8. Integración y pendientes

Flujo previsto por etapa:

1. La fase pasa a `Completada` en exped-service.
2. El backend arma el payload desde la BD, valida las reglas de la §7, calcula `dataHash` y el `recordHash` esperado, y guarda payload y sal en una tabla de anclajes (`lote_id`, `etapa`, `payload`, `data_hash`, `record_hash`, `tx_hash`, `bloque`, `estado`: PENDIENTE / ENVIADA / CONFIRMADA / FALLIDA).
3. Un relayer con el rol correspondiente envía la transacción; un listener confirma el evento `EtapaRegistrada` y compara su `recordHash` con el esperado.
4. Reintentos idempotentes: si la transacción revierte por orden, se lee `registro(loteId, etapa)` y se compara con lo guardado.
5. Verificación pública (QR del empaque): leer los eventos del `loteId`, descargar los payloads públicos, recalcular cada `dataHash` y la cadena de `prevHash`.

Pendientes respecto al código actual:

- exped-service no tiene Parcela, Lote, Semilla, Fase, LoteFase, Personal ni TrabajadorLoteFase: hay que migrarlos desde SGTC (SQLAlchemy → Prisma) y exponer endpoints equivalentes a `POST /lotes`, `POST /lotes/{id}/iniciar-etapa` y `GET /lotes/{id}/fases`.
- Los campos marcados **Propuesto** necesitan columnas nuevas en LoteFase o una tabla clave/valor por fase (similar a `VariableDinamica`).
- SGTC no tiene la trilla (pergamino → café verde) entre `SECADO` y `TOSTADO`; por ahora se registra `kg_verde_entrada` en `TOSTADO`. Si se agrega como etapa propia, decidirlo **antes** de desplegar: el enum del contrato no se puede cambiar después.
- Firma: decidir entre relayer custodio (wallet del backend) o firma directa del técnico con la wallet del login SIWE (`HAFront/src/pages/api/auth/wallet.ts`).
- v1 no permite corregir una etapa anclada. Si hace falta, agregar un evento `EtapaCorregida` que referencie el `recordHash` original sin reemplazarlo.
