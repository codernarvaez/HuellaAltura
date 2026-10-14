// Metadatos públicos de cada red (T02, ADR-003). Es el único sitio del repositorio con nombres de
// red, explorador y RPC público: HAFront los recibe dentro de deployments/<chainId>.json.
// Nunca se copia aquí la URL del .env (AMOY_RPC_URL puede llevar la clave de Alchemy).

export type ChainKind = "local" | "testnet" | "mainnet";

export interface ChainMeta {
  name: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrl: string; // público, sin claves
  explorerUrl: string; // "" si no hay
  kind: ChainKind;
}

const POL = { name: "POL", symbol: "POL", decimals: 18 };

export const NETWORKS: Readonly<Record<number, ChainMeta>> = {
  31337: {
    name: "Hardhat local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrl: "http://127.0.0.1:8545",
    explorerUrl: "",
    kind: "local",
  },
  80002: {
    name: "Polygon Amoy",
    nativeCurrency: POL,
    rpcUrl: "https://polygon-amoy-bor-rpc.publicnode.com",
    explorerUrl: "https://amoy.polygonscan.com",
    kind: "testnet",
  },
  137: {
    name: "Polygon",
    nativeCurrency: POL,
    rpcUrl: "https://polygon-bor-rpc.publicnode.com",
    explorerUrl: "https://polygonscan.com",
    kind: "mainnet",
  },
};

/** Error de la exportación a HAFront: el código dice qué falló y el mensaje, la orden que lo corrige. */
export class ExportError extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
  ) {
    super(`${codigo}: ${mensaje}`);
    this.name = "ExportError";
  }
}

export function chainMeta(chainId: number): ChainMeta {
  const meta = NETWORKS[chainId];
  if (!meta) {
    throw new ExportError(
      "EXP_RED_DESCONOCIDA",
      `chainId ${chainId} no está en scripts/lib/networks.ts; añade sus metadatos públicos (nombre, RPC público, explorador).`,
    );
  }
  return meta;
}
