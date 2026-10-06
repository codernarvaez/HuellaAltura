import { ethers, upgrades } from "hardhat";
import { attach } from "./lib/contracts";
import { saveDeployment } from "./lib/deployments";

// Actualiza la implementación de un contrato manteniendo el proxy y el storage.
//   CONTRACT=TraceabilityController npx hardhat run scripts/upgrade.ts --network amoy
// Si el admin ya es el Safe, solo despliega y valida la nueva implementación e imprime
// la dirección para proponer `upgradeToAndCall` desde el Safe.

const NAMES = ["CoffeeToken", "OriginRegistry", "TraceabilityController"] as const;

async function main() {
  const name = process.env.CONTRACT as (typeof NAMES)[number];
  if (!NAMES.includes(name)) throw new Error(`Define CONTRACT=${NAMES.join("|")}`);

  const { d } = await attach();
  const [signer] = await ethers.getSigners();
  const proxy = d.contracts[name].proxy;
  const factory = await ethers.getContractFactory(name);
  const current = await ethers.getContractAt(name, proxy);
  const isAdmin = await current.hasRole(await current.DEFAULT_ADMIN_ROLE(), signer.address);

  if (!isAdmin) {
    const impl = await upgrades.prepareUpgrade(proxy, factory, { kind: "uups" });
    console.log(`Nueva implementación validada y desplegada: ${impl}`);
    console.log(`Propón desde el Safe: ${proxy}.upgradeToAndCall(${impl}, 0x)`);
    return;
  }

  await upgrades.upgradeProxy(proxy, factory, { kind: "uups" });
  const implementation = await upgrades.erc1967.getImplementationAddress(proxy);
  d.contracts[name].implementation = implementation;
  await saveDeployment(d);
  console.log(`${name} actualizado. Implementación: ${implementation}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
