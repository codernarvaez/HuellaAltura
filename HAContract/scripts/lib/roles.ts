import { ethers, network } from "hardhat";
import type { Signer } from "ethers";
import type { RoleName } from "./contracts";

// Una cuenta por rol para probar cada fase firmada por su actor (modo firma directa, PLAN §3.6).
// En la red local son las cuentas públicas de Hardhat #1–#6 (sin valor). En Amoy se leen
// <ROL>_PRIVATE_KEY del .env: nunca se escriben claves en el repo.

export const ROLE_ACCOUNTS = [
  { key: "relayer", role: "RELAYER_ROLE", env: "RELAYER_PRIVATE_KEY", fase: "Registra fincas (chain-service)" },
  { key: "auditor", role: "AUDITOR_ROLE", env: "AUDITOR_PRIVATE_KEY", fase: "Ancla la auditoría y emite/revoca el DDS" },
  { key: "farmer", role: "FARMER_ROLE", env: "FARMER_PRIVATE_KEY", fase: "Cosecha (registerHarvest)" },
  { key: "processor", role: "PROCESSOR_ROLE", env: "PROCESSOR_PRIVATE_KEY", fase: "Beneficio, secado y trilla" },
  { key: "grader", role: "GRADER_ROLE", env: "GRADER_PRIVATE_KEY", fase: "Cata SCA" },
  { key: "exporter", role: "EXPORTER_ROLE", env: "EXPORTER_PRIVATE_KEY", fase: "Sacos, lote de exportación y exportación" },
] as const satisfies readonly { key: string; role: RoleName; env: string; fase: string }[];

export type RoleKey = (typeof ROLE_ACCOUNTS)[number]["key"];
export type RoleSigners = Record<RoleKey, Signer & { address: string }>;

export const isLocal = () => network.name === "hardhat" || network.name === "localhost";

export async function roleSigners(): Promise<RoleSigners> {
  const out = {} as RoleSigners;
  if (isLocal()) {
    const signers = await ethers.getSigners();
    ROLE_ACCOUNTS.forEach((r, i) => (out[r.key] = signers[i + 1]));
    return out;
  }
  const missing = ROLE_ACCOUNTS.filter((r) => !process.env[r.env]?.trim()).map((r) => r.env);
  if (missing.length) throw new Error(`Faltan en .env: ${missing.join(", ")}`);
  for (const r of ROLE_ACCOUNTS) out[r.key] = new ethers.Wallet(process.env[r.env]!.trim(), ethers.provider);
  return out;
}
