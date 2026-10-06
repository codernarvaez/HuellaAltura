import { artifacts, ethers, network, upgrades } from "hardhat";
import type { CoffeeToken, OriginRegistry, TraceabilityController } from "../typechain-types";
import { grantRelayer } from "./lib/contracts";
import { saveDeployment } from "./lib/deployments";

// Despliega los tres contratos detrás de proxies UUPS (EIP-1967), conecta los roles
// y guarda direcciones + ABI en deployments/<chainId>.json (PLAN §4 Fase 2).
//
// Variables opcionales:
//   RELAYER_ADDRESS  cuenta del chain-service; recibe los roles operativos.
//   SAFE_ADDRESS     multisig que pasa a ser el único admin (el desplegador renuncia).

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error(`Sin cuenta para la red ${network.name}: define DEPLOYER_PRIVATE_KEY en .env`);
  const { chainId } = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Red ${network.name} (chainId ${chainId}) · desplegador ${deployer.address} · ${ethers.formatEther(balance)} POL`);

  const proxy = async (name: string, args: unknown[]) => {
    const factory = await ethers.getContractFactory(name);
    const c = await upgrades.deployProxy(factory, args, { kind: "uups" });
    await c.waitForDeployment();
    const address = await c.getAddress();
    const implementation = await upgrades.erc1967.getImplementationAddress(address);
    console.log(`${name}: proxy ${address} · implementación ${implementation}`);
    return { c, record: { proxy: address, implementation } };
  };

  const token = await proxy("CoffeeToken", [deployer.address]);
  const origin = await proxy("OriginRegistry", [deployer.address, token.record.proxy]);
  const controller = await proxy("TraceabilityController", [
    deployer.address,
    token.record.proxy,
    origin.record.proxy,
  ]);

  const tokenC = token.c as unknown as CoffeeToken;
  const originC = origin.c as unknown as OriginRegistry;
  const controllerC = controller.c as unknown as TraceabilityController;

  // Solo los contratos acuñan, queman y mueven saldos.
  const CONTROLLER_ROLE = await tokenC.CONTROLLER_ROLE();
  await (await tokenC.grantRole(CONTROLLER_ROLE, origin.record.proxy)).wait();
  await (await tokenC.grantRole(CONTROLLER_ROLE, controller.record.proxy)).wait();
  console.log("CONTROLLER_ROLE del token -> OriginRegistry y TraceabilityController");

  const relayer = process.env.RELAYER_ADDRESS?.trim();
  if (relayer) {
    console.log("Roles del relayer:");
    await grantRelayer(originC, controllerC, relayer);
  }

  let admin = deployer.address;
  const safe = process.env.SAFE_ADDRESS?.trim();
  if (safe) {
    console.log(`Transfiriendo la administración al Safe ${safe}`);
    for (const c of [tokenC, originC, controllerC]) {
      const ADMIN = await c.DEFAULT_ADMIN_ROLE();
      await (await c.grantRole(ADMIN, safe)).wait();
      await (await c.renounceRole(ADMIN, deployer.address)).wait();
    }
    admin = safe;
  }

  const abi: Record<string, unknown> = {};
  for (const name of ["CoffeeToken", "OriginRegistry", "TraceabilityController"]) {
    abi[name] = (await artifacts.readArtifact(name)).abi;
  }
  const file = await saveDeployment({
    network: network.name,
    chainId: Number(chainId),
    deployer: deployer.address,
    admin,
    deployedAt: new Date().toISOString(),
    contracts: {
      CoffeeToken: token.record,
      OriginRegistry: origin.record,
      TraceabilityController: controller.record,
    },
    abi,
  });
  console.log(`Despliegue guardado en ${file}`);
  if (chainId === 80002n) {
    console.log(`Explorador: https://amoy.polygonscan.com/address/${controller.record.proxy}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
