import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { artifacts, network } from "hardhat";
import { CONTRACT_NAMES, DIR, readDeploymentDir, saveDeployment, type ContractName, type Deployment, type DeploymentBase } from "./lib/deployments";
import { cambioRelevante, completar, comprobar, describirCommit, generarAbisTs, migrar, serializar, type Problema } from "./lib/frontExport";
import { ExportError, chainMeta } from "./lib/networks";

// Copia los despliegues a HAFront y regenera sus ABI tipados (T02, SCRUM-7).
//   npm run export:front          copia deployments/*.json a HAFront y regenera abis.ts
//   npm run export:front:check    no escribe; sale con código 1 si HAFront no está al día (CI)
// deploy.ts y upgrade.ts lo llaman al terminar.

const RAIZ = join(__dirname, "..", "..");
const FRONT_CHAIN = join(RAIZ, "HAFront", "src", "lib", "chain");
const FRONT_DEPLOYMENTS = join(FRONT_CHAIN, "deployments");
const ABIS_TS = join(FRONT_CHAIN, "abis.ts");

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/** Commit actual; los propios archivos generados no cuentan como cambios sin commit. */
function commitActual(): string {
  try {
    const head = git(["rev-parse", "--short", "HEAD"]);
    const sucio = git(["status", "--porcelain", "--", ".", ":!HAContract/deployments", ":!HAFront/src/lib/chain"]) !== "";
    return describirCommit(head, sucio);
  } catch {
    return describirCommit(null, false);
  }
}

async function abisCompilados(): Promise<Record<ContractName, readonly unknown[]>> {
  const out = {} as Record<ContractName, readonly unknown[]>;
  for (const n of CONTRACT_NAMES) out[n] = (await artifacts.readArtifact(n)).abi;
  return out;
}

async function leerOpcional(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

function parsear(texto: string | undefined, archivo: string): unknown {
  if (texto === undefined) return null;
  try {
    return JSON.parse(texto);
  } catch {
    throw new ExportError("EXP_JSON_INVALIDO", `${archivo} no es JSON válido.`);
  }
}

/** Completa un despliegue recién hecho (o actualizado) y lo guarda en HAContract/deployments. */
export async function guardarDespliegue(d: DeploymentBase): Promise<string> {
  const v1 = completar(d, chainMeta(d.chainId), commitActual(), new Date().toISOString());
  return saveDeployment(serializar(v1), d.chainId);
}

/** Copia cada HAContract/deployments/<id>.json a HAFront (solo si cambió algo relevante) y regenera abis.ts. */
export async function exportarFront(): Promise<void> {
  if (!existsSync(join(RAIZ, "HAFront", "package.json"))) {
    // Contenedor `hardhat` de docker-compose: solo tiene HAContract.
    console.log("HAFront no está en esta copia del repositorio: se omite la exportación.");
    return;
  }
  const origen = await readDeploymentDir(DIR);
  const front = await readDeploymentDir(FRONT_DEPLOYMENTS);
  const commit = commitActual();
  const at = new Date().toISOString();
  await mkdir(FRONT_DEPLOYMENTS, { recursive: true });

  const lineas: string[] = [];
  for (const [archivo, texto] of Object.entries(origen)) {
    const base = migrar(parsear(texto, `HAContract/deployments/${archivo}`), process.env);
    const nuevo = completar(base, chainMeta(base.chainId), commit, at);
    let previo: Deployment | null = null;
    try {
      previo = parsear(front[archivo], archivo) as Deployment | null;
    } catch {
      previo = null; // copia ilegible: se reescribe
    }
    const cambia = cambioRelevante(previo, nuevo);
    const salida = cambia ? serializar(nuevo) : front[archivo]!;
    // Las dos copias quedan idénticas byte a byte.
    await writeFile(join(FRONT_DEPLOYMENTS, archivo), salida);
    if (salida !== texto) await writeFile(join(DIR, archivo), salida);
    lineas.push(`  ${base.chainId} ${cambia ? "actualizado" : "sin cambios"}`);
  }

  const abisTs = generarAbisTs(await abisCompilados());
  const abisCambia = (await leerOpcional(ABIS_TS)) !== abisTs;
  if (abisCambia) await writeFile(ABIS_TS, abisTs);
  lineas.push(`  abis.ts ${abisCambia ? "actualizado" : "sin cambios"}`);

  const redes = Object.keys(origen).map((a) => `deployments/${a}`);
  console.log(`Exportado a HAFront: ${[...redes, "abis.ts"].join(", ")}`);
  console.log(lineas.join("\n"));
  if (redes.length === 0) console.log("  (no hay despliegues en HAContract/deployments: ejecuta npm run deploy:local)");
}

/** Modo CI: compara HAFront con los contratos compilados y con un despliegue limpio en memoria. */
export async function comprobarFront(): Promise<Problema[]> {
  if (network.name !== "hardhat") {
    throw new Error("export:front:check debe ejecutarse en la red en memoria hardhat (sin --network).");
  }
  const { desplegar } = await import("./deploy");
  const origen = await readDeploymentDir(DIR);
  delete origen["31337.json"]; // en HAContract no se versiona
  const local31337 = completar(await desplegar(), chainMeta(31337), "check", new Date().toISOString());
  return comprobar({
    artifacts: await abisCompilados(),
    abisTsActual: await leerOpcional(ABIS_TS),
    front: await readDeploymentDir(FRONT_DEPLOYMENTS),
    origen,
    local31337,
  });
}

async function main() {
  if (process.env.EXPORT_CHECK !== "1") {
    await exportarFront();
    return;
  }
  const problemas = await comprobarFront();
  for (const p of problemas) console.log(`${p.nivel === "error" ? "✗" : "!"} ${p.codigo}: ${p.mensaje}`);
  const errores = problemas.filter((p) => p.nivel === "error").length;
  console.log(errores ? `${errores} problema(s): HAFront no está al día.` : "HAFront está al día con los contratos.");
  if (errores) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err instanceof ExportError ? err.message : err);
    process.exitCode = 1;
  });
}
