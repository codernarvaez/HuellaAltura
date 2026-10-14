import { artifacts, ethers, network, upgrades } from "hardhat";
import type { CoffeeToken, OriginRegistry, TraceabilityController } from "../typechain-types";
import { grantRelayer } from "./lib/contracts";
import type { DeploymentBase } from "./lib/deployments";
import { chainMeta } from "./lib/networks";
import { exportarFront, guardarDespliegue } from "./exportFront";

// Despliega los tres contratos detrás de proxies UUPS (EIP-1967), conecta los roles,
// guarda direcciones + ABI en deployments/<chainId>.json (PLAN §4 Fase 2) y lo exporta a HAFront (T02).
//
// Variables opcionales:
//   RELAYER_ADDRESS  cuenta del chain-service; recibe los roles operativos.
//   SAFE_ADDRESS     multisig que pasa a ser el único admin (el desplegador renuncia).

export interface OpcionesDespliegue {
  relayer?: string;
  safe?: string;
  log?: (msg: string) => void;
}

/** Despliega y devuelve los datos base del despliegue, sin escribir nada en disco. */
export async function desplegar(opts: OpcionesDespliegue = {}): Promise<DeploymentBase> {
  const log = opts.log ?? (() => {});
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error(`Sin cuenta para la red ${network.name}: define DEPLOYER_PRIVATE_KEY en .env`);
  const { chainId } = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);
  log(`Red ${network.name} (chainId ${chainId}) · desplegador ${deployer.address} · ${ethers.formatEther(balance)} POL`);

  let startBlock: number | undefined;
  const proxy = async (name: string, args: unknown[]) => {
    const factory = await ethers.getContractFactory(name);
    const c = await upgrades.deployProxy(factory, args, { kind: "uups" });
    await c.waitForDeployment();
    // Bloque del primer proxy: desde ahí leen eventos HAFront y el indexador (T02).
    const receipt = await c.deploymentTransaction()?.wait();
    startBlock ??= receipt?.blockNumber ?? (await ethers.provider.getBlockNumber());
    const address = await c.getAddress();
    const implementation = await upgrades.erc1967.getImplementationAddress(address);
    log(`${name}: proxy ${address} · implementación ${implementation}`);
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
  log("CONTROLLER_ROLE del token -> OriginRegistry y TraceabilityController");

  if (opts.relayer) {
    log("Roles del relayer:");
    await grantRelayer(originC, controllerC, opts.relayer);
  }

  let admin = deployer.address;
  if (opts.safe) {
    log(`Transfiriendo la administración al Safe ${opts.safe}`);
    for (const c of [tokenC, originC, controllerC]) {
      const ADMIN = await c.DEFAULT_ADMIN_ROLE();
      await (await c.grantRole(ADMIN, opts.safe)).wait();
      await (await c.renounceRole(ADMIN, deployer.address)).wait();
    }
    admin = opts.safe;
  }

  return {
    network: network.name,
    chainId: Number(chainId),
    deployer: deployer.address,
    admin,
    deployedAt: new Date().toISOString(),
    startBlock: startBlock!,
    contracts: {
      CoffeeToken: token.record,
      OriginRegistry: origin.record,
      TraceabilityController: controller.record,
    },
    abi: {
      CoffeeToken: (await artifacts.readArtifact("CoffeeToken")).abi,
      OriginRegistry: (await artifacts.readArtifact("OriginRegistry")).abi,
      TraceabilityController: (await artifacts.readArtifact("TraceabilityController")).abi,
    },
  };
}

async function main() {
  const d = await desplegar({
    relayer: process.env.RELAYER_ADDRESS?.trim() || undefined,
    safe: process.env.SAFE_ADDRESS?.trim() || undefined,
    log: console.log,
  });
  const file = await guardarDespliegue(d);
  console.log(`Despliegue guardado en ${file} (startBlock ${d.startBlock})`);
  await exportarFront();
  const { explorerUrl } = chainMeta(d.chainId);
  if (explorerUrl) console.log(`Explorador: ${explorerUrl}/address/${d.contracts.TraceabilityController.proxy}`);
}

// Solo al ejecutarlo con `hardhat run`; exportFront.ts importa desplegar() para la comprobación.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
