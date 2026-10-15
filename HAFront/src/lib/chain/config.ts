import { getAddress, isAddress, keccak256, stringToBytes, type Address } from "viem";

// Configuración de red de HAFront (T02, SCRUM-7, ADR-003). La red se elige con PUBLIC_CHAIN_ID y
// todo lo demás (direcciones, bloque inicial, red y ABI) sale de deployments/<chainId>.json,
// que genera HAContract (`npm run export:front`). Módulo puro: sin Vite ni Astro, se prueba con
// node:test. registro.ts le pasa los JSON y el entorno.

export type ContractName = "CoffeeToken" | "OriginRegistry" | "TraceabilityController";
export type ChainKind = "local" | "testnet" | "mainnet";

export const FORMATO = "huellaaltura.deployment/1";
export const CONTRATOS: readonly ContractName[] = ["CoffeeToken", "OriginRegistry", "TraceabilityController"];

/** Formato huellaaltura.deployment/1 (HAContract/schemas/deployment.v1.json). */
export interface Despliegue {
  format: typeof FORMATO;
  network: string;
  chainId: number;
  chain: {
    name: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrl: string;
    explorerUrl: string;
    kind: ChainKind;
  };
  deployer: Address;
  admin: Address;
  deployedAt: string;
  startBlock: number;
  contracts: Record<ContractName, { proxy: Address; implementation: Address; abiHash: string }>;
  abi: Record<ContractName, readonly unknown[]>;
  generatedBy: { tool: string; commit: string; at: string };
}

export type EntornoCadena = Partial<
  Record<"PUBLIC_CHAIN_ID" | "PUBLIC_RPC_URL" | "PUBLIC_IPFS_GATEWAY" | "PUBLIC_FROM_BLOCK", string>
>;

/** Variables anteriores a T02: se ignoran (las direcciones salen del JSON) y se avisa en el log. */
export const VARIABLES_OBSOLETAS = [
  "PUBLIC_TRACEABILITY_ADDRESS",
  "PUBLIC_ORIGIN_ADDRESS",
  "PUBLIC_TOKEN_ADDRESS",
] as const;

export type CodigoErrorCadena =
  | "CHAIN_ID_AUSENTE"
  | "CHAIN_ID_INVALIDO"
  | "RED_SIN_DESPLIEGUE"
  | "FORMATO_NO_SOPORTADO"
  | "DESPLIEGUE_INVALIDO"
  | "CHAIN_ID_NO_COINCIDE"
  | "RPC_INVALIDO"
  | "RPC_INSEGURO"
  | "GATEWAY_INVALIDO"
  | "BLOQUE_INVALIDO"
  | "ABI_INCOMPATIBLE";

export class ErrorConfigCadena extends Error {
  readonly codigo: CodigoErrorCadena;
  readonly detalle: string;

  // Sin propiedades de parámetro: node --experimental-strip-types no las admite.
  constructor(codigo: CodigoErrorCadena, detalle: string) {
    super(`${codigo}: ${detalle}`);
    this.name = "ErrorConfigCadena";
    this.codigo = codigo;
    this.detalle = detalle;
  }
}

export interface ConfigCadena {
  chainId: number;
  network: string;
  chain: { name: string; nativeCurrency: { name: string; symbol: string; decimals: number }; explorerUrl: string; kind: ChainKind };
  rpcUrl: string;
  ipfsGateway: string; // siempre termina en "/"
  fromBlock: bigint;
  contratos: Record<ContractName, Address>; // proxies, con checksum
  abiCompatible: Record<ContractName, boolean>;
  origen: { deployedAt: string; commit: string };
}

/** Lo que llega al navegador: la forma de ChainConfig (trazabilidad.ts) más la red. Serializable. */
export interface ConfigPublica {
  rpcUrl: string;
  chainId: number;
  traceability: Address;
  origin: Address;
  token: Address;
  fromBlock: string;
  ipfsGateway: string;
  red: {
    name: string;
    kind: ChainKind;
    explorerUrl: string;
    nativeCurrency: { name: string; symbol: string; decimals: number }; // para wallet_addEthereumChain (T03)
  };
  abiCompatible: boolean; // los tres contratos coinciden
}

/** Único gateway escrito en el código: se usa si no hay PUBLIC_IPFS_GATEWAY. */
export const GATEWAY_POR_DEFECTO = "https://gateway.pinata.cloud/ipfs/";

const KINDS: readonly ChainKind[] = ["local", "testnet", "mainnet"];
/** Regla del formato: "kind": "local" solo vale para la red de Hardhat (excepción declarada al grep de T02). */
export const CHAIN_ID_LOCAL = 31337;

type Obj = Record<string, unknown>;
const esObjeto = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const esTexto = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const esEnteroNoNegativo = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

/** JSON canónico (claves ordenadas), igual que canonicalJSON de HAContract/scripts/lib/documents.ts. */
export function jsonCanonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(",")}]`;
  if (esObjeto(valor)) {
    const entradas = Object.entries(valor)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1)); // las claves de un objeto nunca se repiten
    return `{${entradas.map(([k, v]) => `${JSON.stringify(k)}:${jsonCanonico(v)}`).join(",")}}`;
  }
  return JSON.stringify(valor);
}

/** keccak256 del JSON canónico del ABI: el abiHash del formato de despliegue. */
export function huellaAbi(abi: readonly unknown[]): string {
  return keccak256(stringToBytes(jsonCanonico(abi)));
}

export function validarDespliegue(raw: unknown, chainIdEsperado: number): Despliegue {
  const archivo = `deployments/${chainIdEsperado}.json`;
  const invalido = (ruta: string, motivo: string) =>
    new ErrorConfigCadena("DESPLIEGUE_INVALIDO", `${archivo}: ${ruta} ${motivo}`);

  if (!esObjeto(raw)) throw invalido("(raíz)", "no es un objeto");
  if (raw.format !== FORMATO) {
    throw new ErrorConfigCadena("FORMATO_NO_SOPORTADO", `Formato ${String(raw.format)} no soportado; se esperaba ${FORMATO}`);
  }
  if (!Number.isSafeInteger(raw.chainId) || (raw.chainId as number) < 1) throw invalido("chainId", "no es un entero positivo");
  if (raw.chainId !== chainIdEsperado) {
    throw new ErrorConfigCadena("CHAIN_ID_NO_COINCIDE", `${archivo} declara chainId ${raw.chainId}`);
  }
  if (!esTexto(raw.network)) throw invalido("network", "falta");

  const chain = raw.chain;
  if (!esObjeto(chain)) throw invalido("chain", "falta");
  if (!esTexto(chain.name)) throw invalido("chain.name", "falta");
  const moneda = chain.nativeCurrency;
  if (!esObjeto(moneda) || !esTexto(moneda.name) || !esTexto(moneda.symbol) || !esEnteroNoNegativo(moneda.decimals)) {
    throw invalido("chain.nativeCurrency", "debe tener name, symbol y decimals");
  }
  if (!KINDS.includes(chain.kind as ChainKind)) throw invalido("chain.kind", "debe ser local, testnet o mainnet");
  if ((chain.kind === "local") !== (chainIdEsperado === CHAIN_ID_LOCAL)) {
    throw invalido("chain.kind", `"${String(chain.kind)}" no corresponde a esta red`);
  }
  if (typeof chain.rpcUrl !== "string") throw invalido("chain.rpcUrl", "falta");
  if (chain.kind !== "local" && !chain.rpcUrl.startsWith("https://")) throw invalido("chain.rpcUrl", "debe ser https");
  if (typeof chain.explorerUrl !== "string" || (chain.explorerUrl !== "" && !chain.explorerUrl.startsWith("https://"))) {
    throw invalido("chain.explorerUrl", 'debe ser "" o una URL https');
  }

  const direccion = (ruta: string, v: unknown) => {
    if (typeof v !== "string" || !isAddress(v, { strict: true }) || getAddress(v) !== v) {
      throw invalido(ruta, "no es una dirección con checksum EIP-55");
    }
  };
  direccion("deployer", raw.deployer);
  direccion("admin", raw.admin);
  if (!esTexto(raw.deployedAt)) throw invalido("deployedAt", "falta");
  if (!esEnteroNoNegativo(raw.startBlock)) throw invalido("startBlock", "debe ser un entero ≥ 0");

  const contracts = raw.contracts;
  const abi = raw.abi;
  if (!esObjeto(contracts) || Object.keys(contracts).sort().join() !== [...CONTRATOS].sort().join()) {
    throw invalido("contracts", `debe tener exactamente ${CONTRATOS.join(", ")}`);
  }
  if (!esObjeto(abi)) throw invalido("abi", "falta");
  for (const n of CONTRATOS) {
    const c = contracts[n];
    if (!esObjeto(c)) throw invalido(`contracts.${n}`, "no es un objeto");
    direccion(`contracts.${n}.proxy`, c.proxy);
    direccion(`contracts.${n}.implementation`, c.implementation);
    if (typeof c.abiHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(c.abiHash)) {
      throw invalido(`contracts.${n}.abiHash`, "debe ser 0x y 64 dígitos hexadecimales");
    }
    const lista = abi[n];
    if (!Array.isArray(lista) || lista.length === 0) throw invalido(`abi.${n}`, "debe ser un array no vacío");
    if (huellaAbi(lista) !== c.abiHash.toLowerCase()) throw invalido(`abi.${n}`, `no corresponde a contracts.${n}.abiHash`);
  }

  const gen = raw.generatedBy;
  if (!esObjeto(gen) || !esTexto(gen.tool) || !esTexto(gen.commit) || !esTexto(gen.at)) {
    throw invalido("generatedBy", "debe tener tool, commit y at");
  }
  return raw as unknown as Despliegue;
}

export function leerChainId(valor: string | undefined, disponibles: readonly number[] = []): number {
  if (valor === undefined || valor === "") {
    throw new ErrorConfigCadena("CHAIN_ID_AUSENTE", `Define PUBLIC_CHAIN_ID (redes disponibles: ${disponibles.join(", ") || "ninguna"})`);
  }
  const n = Number(valor);
  if (!/^[1-9][0-9]{0,15}$/.test(valor) || !Number.isSafeInteger(n)) {
    throw new ErrorConfigCadena("CHAIN_ID_INVALIDO", "PUBLIC_CHAIN_ID debe ser un entero decimal positivo");
  }
  return n;
}

function url(valor: string): URL | null {
  try {
    return new URL(valor);
  } catch {
    return null;
  }
}

export function validarRpc(valor: string, kind: ChainKind): string {
  const u = url(valor);
  if (!u || (u.protocol !== "http:" && u.protocol !== "https:")) {
    throw new ErrorConfigCadena("RPC_INVALIDO", "PUBLIC_RPC_URL debe ser una URL http o https");
  }
  if (u.protocol === "http:" && kind !== "local") {
    throw new ErrorConfigCadena("RPC_INSEGURO", "PUBLIC_RPC_URL debe usar https fuera de la red local");
  }
  return valor;
}

export function normalizarGateway(valor: string | undefined): string {
  if (valor === undefined || valor === "") return GATEWAY_POR_DEFECTO;
  const u = url(valor);
  const local = u?.hostname === "localhost" || u?.hostname === "127.0.0.1";
  if (!u || !(u.protocol === "https:" || (u.protocol === "http:" && local))) {
    throw new ErrorConfigCadena("GATEWAY_INVALIDO", "PUBLIC_IPFS_GATEWAY debe ser una URL https (o http a localhost)");
  }
  return valor.endsWith("/") ? valor : `${valor}/`;
}

export function leerBloque(valor: string | undefined, porDefecto: number): bigint {
  if (valor === undefined || valor === "") return BigInt(porDefecto);
  if (!/^[0-9]{1,15}$/.test(valor)) {
    throw new ErrorConfigCadena("BLOQUE_INVALIDO", "PUBLIC_FROM_BLOCK debe ser un entero decimal ≥ 0");
  }
  return BigInt(valor);
}

export function resolverConfigCadena(
  entorno: EntornoCadena,
  registro: Readonly<Record<number, unknown>>,
  hashes: Readonly<Record<ContractName, string>>,
): ConfigCadena {
  const disponibles = Object.keys(registro).map(Number);
  const chainId = leerChainId(entorno.PUBLIC_CHAIN_ID, disponibles);
  if (!(chainId in registro)) {
    throw new ErrorConfigCadena(
      "RED_SIN_DESPLIEGUE",
      `No hay deployments/${chainId}.json en HAFront (redes disponibles: ${disponibles.join(", ") || "ninguna"}); ejecuta npm run export:front en HAContract`,
    );
  }
  const d = validarDespliegue(registro[chainId], chainId);
  const { rpcUrl: _rpc, ...chain } = d.chain;
  return {
    chainId,
    network: d.network,
    chain,
    rpcUrl: validarRpc(entorno.PUBLIC_RPC_URL || d.chain.rpcUrl, d.chain.kind),
    ipfsGateway: normalizarGateway(entorno.PUBLIC_IPFS_GATEWAY),
    fromBlock: leerBloque(entorno.PUBLIC_FROM_BLOCK, d.startBlock),
    contratos: {
      CoffeeToken: getAddress(d.contracts.CoffeeToken.proxy),
      OriginRegistry: getAddress(d.contracts.OriginRegistry.proxy),
      TraceabilityController: getAddress(d.contracts.TraceabilityController.proxy),
    },
    abiCompatible: {
      CoffeeToken: d.contracts.CoffeeToken.abiHash.toLowerCase() === hashes.CoffeeToken.toLowerCase(),
      OriginRegistry: d.contracts.OriginRegistry.abiHash.toLowerCase() === hashes.OriginRegistry.toLowerCase(),
      TraceabilityController:
        d.contracts.TraceabilityController.abiHash.toLowerCase() === hashes.TraceabilityController.toLowerCase(),
    },
    origen: { deployedAt: d.deployedAt, commit: d.generatedBy.commit },
  };
}

export function aConfigPublica(cfg: ConfigCadena): ConfigPublica {
  return {
    rpcUrl: cfg.rpcUrl,
    chainId: cfg.chainId,
    traceability: cfg.contratos.TraceabilityController,
    origin: cfg.contratos.OriginRegistry,
    token: cfg.contratos.CoffeeToken,
    fromBlock: cfg.fromBlock.toString(),
    ipfsGateway: cfg.ipfsGateway,
    red: {
      name: cfg.chain.name,
      kind: cfg.chain.kind,
      explorerUrl: cfg.chain.explorerUrl,
      nativeCurrency: cfg.chain.nativeCurrency,
    },
    abiCompatible: CONTRATOS.every((n) => cfg.abiCompatible[n]),
  };
}

/** Antes de firmar (T03): el contrato desplegado debe tener la interfaz de esta versión. */
export function exigirAbiCompatible(cfg: ConfigCadena, nombre: ContractName): void {
  if (!cfg.abiCompatible[nombre]) {
    throw new ErrorConfigCadena("ABI_INCOMPATIBLE", `${nombre} en ${cfg.chain.name} no coincide con el ABI de esta versión`);
  }
}

export function urlExplorador(
  cfg: { chain: { explorerUrl: string } },
  tipo: "tx" | "address" | "block",
  valor: string,
): string | null {
  const base = cfg.chain.explorerUrl.replace(/\/+$/, "");
  return base ? `${base}/${tipo}/${valor}` : null;
}

export function variablesObsoletasPresentes(env: Readonly<Record<string, string | undefined>>): string[] {
  return VARIABLES_OBSOLETAS.filter((n) => env[n] !== undefined && env[n] !== "");
}
