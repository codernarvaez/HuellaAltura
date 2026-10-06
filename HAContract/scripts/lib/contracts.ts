import { ethers } from "hardhat";
import type { CoffeeToken, OriginRegistry, TraceabilityController } from "../../typechain-types";
import { loadDeployment } from "./deployments";

/** Conecta con los proxies desplegados en la red actual. */
export async function attach() {
  const { chainId } = await ethers.provider.getNetwork();
  const d = await loadDeployment(chainId);
  const token = (await ethers.getContractAt("CoffeeToken", d.contracts.CoffeeToken.proxy)) as unknown as CoffeeToken;
  const origin = (await ethers.getContractAt(
    "OriginRegistry",
    d.contracts.OriginRegistry.proxy,
  )) as unknown as OriginRegistry;
  const controller = (await ethers.getContractAt(
    "TraceabilityController",
    d.contracts.TraceabilityController.proxy,
  )) as unknown as TraceabilityController;
  return { d, chainId, token, origin, controller };
}

export type RoleName = "RELAYER_ROLE" | "FARMER_ROLE" | "PROCESSOR_ROLE" | "GRADER_ROLE" | "EXPORTER_ROLE" | "AUDITOR_ROLE";

/** Concede un rol si aún no lo tiene. Devuelve true si envió la transacción. */
export async function grantRole(
  target: OriginRegistry | TraceabilityController,
  role: RoleName,
  account: string,
): Promise<boolean> {
  const id = ethers.id(role);
  if (await target.hasRole(id, account)) return false;
  await (await target.grantRole(id, account)).wait();
  console.log(`  ${role} -> ${account} (${await target.getAddress()})`);
  return true;
}

/**
 * Roles operativos del relayer (chain-service): firma en nombre de técnicos y procesadores
 * sin wallet (PLAN §3.6). No es admin.
 */
export async function grantRelayer(origin: OriginRegistry, controller: TraceabilityController, relayer: string) {
  await grantRole(origin, "RELAYER_ROLE", relayer);
  await grantRole(origin, "AUDITOR_ROLE", relayer);
  for (const role of ["RELAYER_ROLE", "FARMER_ROLE", "PROCESSOR_ROLE", "GRADER_ROLE", "EXPORTER_ROLE"] as const) {
    await grantRole(controller, role, relayer);
  }
}
