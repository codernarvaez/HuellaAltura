import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChainMeta } from "./networks";

// Direcciones y ABIs por chainId (PLAN §4 Fase 2): deployments/<chainId>.json.
// Formato huellaaltura.deployment/1 (T02): contrato de interfaz entre HAContract y HAFront,
// descrito en schemas/deployment.v1.json.
export const DIR = join(__dirname, "..", "..", "deployments");

export const CONTRACT_NAMES = ["CoffeeToken", "OriginRegistry", "TraceabilityController"] as const;
export type ContractName = (typeof CONTRACT_NAMES)[number];

/** Datos del despliegue sin los campos que añade la exportación (format, chain, abiHash, generatedBy). */
export interface DeploymentBase {
  network: string;
  chainId: number;
  deployer: string;
  admin: string;
  deployedAt: string;
  startBlock: number;
  contracts: Record<ContractName, { proxy: string; implementation: string }>;
  abi: Record<ContractName, readonly unknown[]>;
}

export interface ContractRecord {
  proxy: string;
  implementation: string;
  abiHash: string;
}

export interface Deployment {
  format: "huellaaltura.deployment/1";
  network: string;
  chainId: number;
  chain: ChainMeta;
  deployer: string;
  admin: string;
  deployedAt: string;
  startBlock: number;
  contracts: Record<ContractName, ContractRecord>;
  abi: Record<ContractName, readonly unknown[]>;
  generatedBy: { tool: string; commit: string; at: string };
}

/** Lo que tienen en común el formato v1 y el anterior a T02 (lo que usan attach() y los scripts). */
export interface StoredDeployment {
  format?: string;
  chainId: number;
  contracts: Record<ContractName, { proxy: string; implementation: string }>;
  abi: Record<string, unknown>;
}

export function deploymentFile(chainId: number | bigint, dir = DIR): string {
  return join(dir, `${chainId}.json`);
}

export async function saveDeployment(text: string, chainId: number, dir = DIR): Promise<string> {
  await mkdir(dir, { recursive: true });
  const file = deploymentFile(chainId, dir);
  await writeFile(file, text);
  return file;
}

export async function loadDeployment(chainId: number | bigint): Promise<StoredDeployment> {
  const file = deploymentFile(chainId);
  try {
    return JSON.parse(await readFile(file, "utf8")) as StoredDeployment;
  } catch {
    throw new Error(`No hay despliegue para chainId ${chainId} (${file}). Ejecuta primero el deploy.`);
  }
}

/** Contenido de los <chainId>.json de una carpeta (nombre de archivo → texto). Carpeta ausente = vacía. */
export async function readDeploymentDir(dir: string): Promise<Record<string, string>> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const name of names.filter((n) => /^[0-9]+\.json$/.test(n)).sort()) {
    out[name] = await readFile(join(dir, name), "utf8");
  }
  return out;
}
