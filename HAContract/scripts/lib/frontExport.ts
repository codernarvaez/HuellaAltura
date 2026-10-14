import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { getAddress, keccak256, toUtf8Bytes } from "ethers";
import deploymentSchema from "../../schemas/deployment.v1.json";
import { CONTRACT_NAMES, type ContractName, type Deployment, type DeploymentBase } from "./deployments";
import { canonicalJSON } from "./documents";
import { ExportError, type ChainMeta } from "./networks";

// Exportación de los despliegues a HAFront (T02, SCRUM-7). Funciones puras: no leen ni escriben
// archivos y no dependen de hardhat, para probarlas sin red. La E/S está en scripts/exportFront.ts.

export const FORMAT = "huellaaltura.deployment/1";
export const TOOL = "HAContract export:front";
export const REGENERAR = "cd HAContract && npm run export:front";

export interface Problema {
  codigo: string;
  nivel: "error" | "aviso";
  mensaje: string;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validarEsquema = ajv.compile(deploymentSchema);

type Obj = Record<string, unknown>;
const esObjeto = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Huella del ABI: keccak256 del JSON canónico (misma función que el dataHash de los documentos). */
export function abiHash(abi: readonly unknown[]): `0x${string}` {
  return keccak256(toUtf8Bytes(canonicalJSON(abi))) as `0x${string}`;
}

/** Valor de generatedBy.commit: hash corto, con "-dirty" si hay cambios sin commit. */
export function describirCommit(head: string | null, sucio: boolean): string {
  if (!head) return "desconocido";
  return sucio ? `${head}-dirty` : head;
}

/**
 * Lee un deployments/<chainId>.json en el formato v1 o en el anterior a T02 (sin `format` ni
 * `startBlock`) y devuelve los datos base. En 31337 el bloque inicial por defecto es 0; en otra red
 * hay que darlo con START_BLOCK, porque leer Amoy desde el bloque 0 no funciona con RPC públicos.
 */
export function migrar(raw: unknown, env: { START_BLOCK?: string }): DeploymentBase {
  if (!esObjeto(raw) || !esObjeto(raw.contracts) || !esObjeto(raw.abi)) {
    throw new ExportError("EXP_JSON_INVALIDO", "el despliegue no tiene `contracts` y `abi`; vuelve a desplegar.");
  }
  if (raw.format !== undefined && raw.format !== FORMAT) {
    throw new ExportError("EXP_JSON_INVALIDO", `formato ${String(raw.format)} no soportado; se esperaba ${FORMAT}.`);
  }
  const chainId = raw.chainId as number;
  let startBlock = raw.startBlock;
  if (typeof startBlock !== "number") {
    if (chainId === 31337) {
      startBlock = 0;
    } else if (env.START_BLOCK && /^[0-9]{1,15}$/.test(env.START_BLOCK)) {
      startBlock = Number(env.START_BLOCK);
    } else {
      throw new ExportError(
        "EXP_SIN_BLOQUE_INICIAL",
        `deployments/${chainId}.json no tiene startBlock; ejecuta START_BLOCK=<bloque del despliegue> npm run export:front.`,
      );
    }
  }
  const contracts = raw.contracts as DeploymentBase["contracts"];
  const abi = raw.abi as DeploymentBase["abi"];
  return {
    network: raw.network as string,
    chainId,
    deployer: raw.deployer as string,
    admin: raw.admin as string,
    deployedAt: raw.deployedAt as string,
    startBlock: startBlock as number,
    contracts: Object.fromEntries(
      CONTRACT_NAMES.map((n) => [n, { proxy: contracts[n]?.proxy, implementation: contracts[n]?.implementation }]),
    ) as DeploymentBase["contracts"],
    abi: Object.fromEntries(CONTRACT_NAMES.map((n) => [n, abi[n]])) as DeploymentBase["abi"],
  };
}

/** Añade al despliegue base el formato, la red, la huella de cada ABI y quién generó el archivo. */
export function completar(d: DeploymentBase, chain: ChainMeta, commit: string, at: string): Deployment {
  return {
    format: FORMAT,
    network: d.network,
    chainId: d.chainId,
    chain,
    deployer: d.deployer,
    admin: d.admin,
    deployedAt: d.deployedAt,
    startBlock: d.startBlock,
    contracts: Object.fromEntries(
      CONTRACT_NAMES.map((n) => [n, { ...d.contracts[n], abiHash: abiHash(d.abi[n]) }]),
    ) as Deployment["contracts"],
    abi: d.abi,
    generatedBy: { tool: TOOL, commit, at },
  };
}

/**
 * ¿Hay que reescribir la copia de HAFront? Solo si cambian las direcciones, el bloque inicial, los
 * ABI o los metadatos de la red; así un `deploy:local` que solo cambia `deployedAt` no ensucia git.
 */
export function cambioRelevante(previo: Deployment | null, nuevo: Deployment): boolean {
  if (!previo) return true;
  return (
    previo.format !== nuevo.format ||
    previo.startBlock !== nuevo.startBlock ||
    canonicalJSON(previo.chain) !== canonicalJSON(nuevo.chain) ||
    CONTRACT_NAMES.some((n) => {
      const a = previo.contracts?.[n];
      const b = nuevo.contracts[n];
      return !a || a.proxy !== b.proxy || a.implementation !== b.implementation || a.abiHash !== b.abiHash;
    })
  );
}

const NOMBRE_ABI: Record<ContractName, string> = {
  CoffeeToken: "coffeeTokenAbi",
  OriginRegistry: "originRegistryAbi",
  TraceabilityController: "traceabilityControllerAbi",
};

/** Texto de HAFront/src/lib/chain/abis.ts: ABI completos `as const` (tipado de viem) y su huella. */
export function generarAbisTs(abis: Record<ContractName, readonly unknown[]>): string {
  const bloques = CONTRACT_NAMES.map(
    (n) => `export const ${NOMBRE_ABI[n]} = [\n${abis[n].map((e) => `  ${JSON.stringify(e)}`).join(",\n")}\n] as const;\n`,
  );
  const hashes = CONTRACT_NAMES.map((n) => `  ${n}: "${abiHash(abis[n])}",`).join("\n");
  return [
    `// GENERADO por HAContract \`npm run export:front\` a partir de artifacts/. No editar a mano.`,
    `// Regenerar: ${REGENERAR}`,
    ``,
    ...bloques,
    `/** keccak256 del JSON canónico de cada ABI; se compara con contracts.*.abiHash de cada red. */`,
    `export const ABI_HASH = {\n${hashes}\n} as const;`,
    ``,
    `// Alias que usa lib/chain/trazabilidad.ts.`,
    `export { traceabilityControllerAbi as traceabilityAbi, originRegistryAbi as originAbi, coffeeTokenAbi as tokenAbi };`,
    ``,
  ].join("\n");
}

export function serializar(d: Deployment): string {
  return JSON.stringify(d, null, 2) + "\n";
}

/** Errores de un deployments/<chainId>.json frente al esquema v1 y a las reglas que el esquema no expresa. */
export function validarV1(texto: string, archivo: string): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(texto);
  } catch {
    return [`${archivo}: JSON mal formado`];
  }
  if (!validarEsquema(raw)) {
    return validarEsquema.errors!.map((e) => `${archivo}: ${e.instancePath || "/"} ${e.message}`);
  }
  const d = raw as unknown as Deployment;
  const errores: string[] = [];
  if (`${d.chainId}.json` !== archivo) errores.push(`${archivo}: declara chainId ${d.chainId}`);
  if ((d.chain.kind === "local") !== (d.chainId === 31337)) {
    errores.push(`${archivo}: chain.kind "${d.chain.kind}" no corresponde a chainId ${d.chainId}`);
  }
  if (d.chain.kind !== "local" && !d.chain.rpcUrl.startsWith("https://")) {
    errores.push(`${archivo}: chain.rpcUrl debe ser https fuera de la red local`);
  }
  const direcciones: [string, string][] = [
    ["deployer", d.deployer],
    ["admin", d.admin],
    ...CONTRACT_NAMES.flatMap((n): [string, string][] => [
      [`contracts.${n}.proxy`, d.contracts[n].proxy],
      [`contracts.${n}.implementation`, d.contracts[n].implementation],
    ]),
  ];
  for (const [ruta, valor] of direcciones) {
    if (!conChecksum(valor)) errores.push(`${archivo}: ${ruta} no tiene checksum EIP-55`);
  }
  for (const n of CONTRACT_NAMES) {
    if (abiHash(d.abi[n]) !== d.contracts[n].abiHash) errores.push(`${archivo}: contracts.${n}.abiHash no es la huella de abi.${n}`);
  }
  return errores;
}

function conChecksum(valor: string): boolean {
  try {
    return getAddress(valor) === valor;
  } catch {
    return false; // mayúsculas y minúsculas mezcladas con checksum incorrecto
  }
}

function leer(texto: string | undefined): Deployment | null {
  try {
    return texto === undefined ? null : (JSON.parse(texto) as Deployment);
  } catch {
    return null;
  }
}

/**
 * Comprobación para CI (export:front:check). Devuelve [] si HAFront está al día:
 * abis.ts igual al de los contratos compilados, JSON válidos, copias idénticas a su original
 * versionado en HAContract y 31337.json igual a un despliegue limpio.
 */
export function comprobar(entrada: {
  artifacts: Record<ContractName, readonly unknown[]>;
  abisTsActual: string | null;
  front: Record<string, string>;
  origen: Record<string, string>;
  local31337?: Deployment;
}): Problema[] {
  const problemas: Problema[] = [];
  const error = (codigo: string, mensaje: string) => problemas.push({ codigo, nivel: "error", mensaje });

  if (entrada.abisTsActual !== generarAbisTs(entrada.artifacts)) {
    error("EXP_ABIS_DESACTUALIZADO", `HAFront/src/lib/chain/abis.ts no corresponde a los contratos compilados; ejecuta ${REGENERAR}.`);
  }
  for (const [archivo, texto] of Object.entries(entrada.front)) {
    for (const e of validarV1(texto, archivo)) error("EXP_JSON_INVALIDO", `HAFront/src/lib/chain/deployments/${e}; ejecuta ${REGENERAR}.`);
  }
  for (const [archivo, texto] of Object.entries(entrada.origen)) {
    if (entrada.front[archivo] !== texto) {
      error("EXP_COPIA_DISTINTA", `HAFront/src/lib/chain/deployments/${archivo} no es igual a HAContract/deployments/${archivo}; ejecuta ${REGENERAR}.`);
    }
  }
  if (entrada.local31337 && cambioRelevante(leer(entrada.front["31337.json"]), entrada.local31337)) {
    error("EXP_31337_DESFASADO", `HAFront/src/lib/chain/deployments/31337.json no coincide con un despliegue limpio; ejecuta npm run node, npm run deploy:local y ${REGENERAR}.`);
  }
  for (const [archivo, texto] of Object.entries(entrada.front)) {
    const d = leer(texto);
    if (!d?.contracts || d.chainId === 31337) continue;
    for (const n of CONTRACT_NAMES) {
      if (d.contracts[n]?.abiHash !== abiHash(entrada.artifacts[n])) {
        problemas.push({
          codigo: "EXP_ABI_RED_DISTINTO",
          nivel: "aviso",
          mensaje: `${n} en ${archivo} tiene otro ABI que el código actual (falta el upgrade en esa red).`,
        });
      }
    }
  }
  return problemas;
}
