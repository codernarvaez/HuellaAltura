import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Direcciones y ABIs por chainId (PLAN §4 Fase 2): deployments/<chainId>.json.
const DIR = join(__dirname, "..", "..", "deployments");

export interface ContractRecord {
  proxy: string;
  implementation: string;
}

export interface Deployment {
  network: string;
  chainId: number;
  deployer: string;
  admin: string;
  deployedAt: string;
  contracts: {
    CoffeeToken: ContractRecord;
    OriginRegistry: ContractRecord;
    TraceabilityController: ContractRecord;
  };
  abi: Record<string, unknown>;
}

export async function saveDeployment(d: Deployment): Promise<string> {
  await mkdir(DIR, { recursive: true });
  const file = join(DIR, `${d.chainId}.json`);
  await writeFile(file, JSON.stringify(d, null, 2) + "\n");
  return file;
}

export async function loadDeployment(chainId: number | bigint): Promise<Deployment> {
  const file = join(DIR, `${chainId}.json`);
  try {
    return JSON.parse(await readFile(file, "utf8")) as Deployment;
  } catch {
    throw new Error(`No hay despliegue para chainId ${chainId} (${file}). Ejecuta primero el deploy.`);
  }
}
