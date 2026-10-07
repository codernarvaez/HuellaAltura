import { ethers, network } from "hardhat";
import { attach, grantRole } from "./lib/contracts";
import { ROLE_ACCOUNTS, isLocal, roleSigners } from "./lib/roles";

// Da a cada cuenta de prueba su rol en un despliegue existente (lo firma el admin) y, fuera de
// la red local, le envía POL para el gas si le falta (ROLE_FUND_POL, por defecto 0.02).
// Mnemónica pública por defecto de Hardhat: sus claves no valen nada y solo sirven en local.
const HARDHAT_MNEMONIC = "test test test test test test test test test test test junk";

function hardhatKey(address: string): string {
  for (let i = 0; i < 20; i++) {
    const w = ethers.HDNodeWallet.fromPhrase(HARDHAT_MNEMONIC, undefined, `m/44'/60'/0'/0/${i}`);
    if (w.address === address) return w.privateKey;
  }
  return "(cuenta de hardhat node)";
}

async function main() {
  const { origin, controller } = await attach();
  const [admin] = await ethers.getSigners();
  const signers = await roleSigners();
  const fund = ethers.parseEther(process.env.ROLE_FUND_POL || "0.02");

  console.log(`Red ${network.name} · admin ${admin.address}`);
  for (const r of ROLE_ACCOUNTS) {
    const account = signers[r.key].address;
    if (r.role === "RELAYER_ROLE" || r.role === "AUDITOR_ROLE") await grantRole(origin, r.role, account);
    if (r.role !== "AUDITOR_ROLE") await grantRole(controller, r.role, account);
    if (!isLocal() && (await ethers.provider.getBalance(account)) < fund) {
      await (await admin.sendTransaction({ to: account, value: fund })).wait();
      console.log(`  ${ethers.formatEther(fund)} POL -> ${account}`);
    }
  }

  console.log("\nCuentas por rol:");
  const rows = ROLE_ACCOUNTS.map((r) => ({
    rol: r.role,
    fase: r.fase,
    cuenta: signers[r.key].address,
    // Solo en local: son las claves públicas de Hardhat, sin valor. En Amoy están en tu .env.
    clave: isLocal() ? hardhatKey(signers[r.key].address) : `en .env (${r.env})`,
  }));
  console.table(rows);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
