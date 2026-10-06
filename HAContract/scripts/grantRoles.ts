import { attach, grantRelayer, grantRole, type RoleName } from "./lib/contracts";

// Concede roles en un despliegue existente (lo firma el admin).
//   RELAYER_ADDRESS=0x...                    roles operativos del chain-service
//   ROLE=EXPORTER_ROLE ACCOUNT=0x...         un rol concreto (firma directa con wallet propia)
async function main() {
  const { origin, controller } = await attach();

  const relayer = process.env.RELAYER_ADDRESS?.trim();
  if (relayer) await grantRelayer(origin, controller, relayer);

  const role = process.env.ROLE?.trim() as RoleName | undefined;
  const account = process.env.ACCOUNT?.trim();
  if (role && account) {
    // AUDITOR y RELAYER se usan en OriginRegistry; el resto en el controlador.
    if (role === "AUDITOR_ROLE" || role === "RELAYER_ROLE") await grantRole(origin, role, account);
    if (role !== "AUDITOR_ROLE") await grantRole(controller, role, account);
  }
  if (!relayer && !(role && account)) console.log("Nada que hacer: define RELAYER_ADDRESS o ROLE + ACCOUNT.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
