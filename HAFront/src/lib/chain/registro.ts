import { ABI_HASH } from "./abis";
import {
  ErrorConfigCadena,
  resolverConfigCadena,
  variablesObsoletasPresentes,
  type CodigoErrorCadena,
  type ConfigCadena,
  type EntornoCadena,
} from "./config";

// Registro de redes de HAFront (T02): todos los deployments/<chainId>.json que exporta HAContract.
// Añadir una red es añadir su archivo; no hay rutas de import fijas por red. Solo servidor: el
// navegador recibe ConfigPublica en data-config.

const archivos = import.meta.glob<unknown>("./deployments/*.json", { eager: true, import: "default" });

export const REGISTRO: Readonly<Record<number, unknown>> = Object.fromEntries(
  Object.entries(archivos).flatMap(([ruta, contenido]) => {
    const m = /\/([0-9]+)\.json$/.exec(ruta);
    return m ? [[Number(m[1]), contenido]] : [];
  }),
);

const NOMBRES = ["PUBLIC_CHAIN_ID", "PUBLIC_RPC_URL", "PUBLIC_IPFS_GATEWAY", "PUBLIC_FROM_BLOCK"] as const;

/** Variables en tiempo de ejecución (process.env) y, si no están, las del build o del .env de astro dev. */
export function leerEntornoCadena(): EntornoCadena {
  const viteEnv = import.meta.env as Record<string, string | undefined>;
  return Object.fromEntries(NOMBRES.map((n) => [n, process.env[n] || viteEnv[n] || undefined]));
}

type Resultado = { ok: true; cfg: ConfigCadena } | { ok: false; error: ErrorConfigCadena };
let memo: Resultado | undefined;

function resolver(): Resultado {
  if (memo) return memo;
  const obsoletas = variablesObsoletasPresentes(process.env);
  if (obsoletas.length) {
    console.warn(`[cadena] Se ignoran ${obsoletas.join(", ")}: las direcciones salen de deployments/<chainId>.json (T02).`);
  }
  try {
    memo = { ok: true, cfg: resolverConfigCadena(leerEntornoCadena(), REGISTRO, ABI_HASH) };
  } catch (err) {
    if (!(err instanceof ErrorConfigCadena)) throw err;
    memo = { ok: false, error: err };
  }
  if (memo.ok && !Object.values(memo.cfg.abiCompatible).every(Boolean)) {
    const distintos = Object.entries(memo.cfg.abiCompatible).filter(([, ok]) => !ok).map(([n]) => n);
    console.warn(`[cadena] ABI_INCOMPATIBLE: ${distintos.join(", ")} en ${memo.cfg.chain.name} no coincide con el ABI de esta versión`);
  }
  return memo;
}

/** Configuración de la red activa (memoizada por proceso). Lanza ErrorConfigCadena si es inválida. */
export function configCadena(): ConfigCadena {
  const r = resolver();
  if (!r.ok) throw r.error;
  return r.cfg;
}

let registrado = false;

/** Para páginas: nunca lanza. El detalle del error solo va al log del servidor. */
export function configCadenaSegura(): { ok: true; cfg: ConfigCadena } | { ok: false; codigo: CodigoErrorCadena } {
  const r = resolver();
  if (r.ok) return r;
  if (!registrado) {
    console.error(`[cadena] ${r.error.codigo}: ${r.error.detalle}`);
    registrado = true;
  }
  return { ok: false, codigo: r.error.codigo };
}
