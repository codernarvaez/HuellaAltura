import { run } from "hardhat";
import { attach } from "./lib/contracts";

// Publica el código en Polygonscan (requiere ETHERSCAN_API_KEY). Con la dirección del proxy,
// el plugin de upgrades verifica la implementación y enlaza el proxy.
async function main() {
  const { d } = await attach();
  for (const [name, c] of Object.entries(d.contracts)) {
    console.log(`Verificando ${name} (${c.proxy})`);
    try {
      await run("verify:verify", { address: c.proxy });
    } catch (err) {
      console.error(`  ${name}: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
