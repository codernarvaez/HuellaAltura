import { createPublicClient, defineChain, hexToString, http, type Address, type Hex } from "viem";
import { originAbi, tokenAbi, traceabilityAbi } from "./abis";

// Lectura de la historia de un lote directamente desde la cadena (HU-07). Todo en paralelo
// (Promise.all) porque Multicall3 no está desplegado en la red local.

export interface ChainConfig {
  rpcUrl: string;
  chainId: number;
  traceability: Address;
  origin: Address;
  token: Address;
  fromBlock: string;
  ipfsGateway: string;
}

export interface Lot {
  fincaId: Hex;
  tenantId: Hex;
  variety: Hex;
  ddsCertId: bigint;
  harvestDate: bigint;
  fincaVersion: number;
  form: number;
  state: number;
}

export interface LotNode {
  id: bigint;
  lot: Lot;
  parents: readonly bigint[];
  grams: bigint; // en circulación
}

export interface Origin {
  fincaId: Hex;
  fincaVersion: number;
  areaHa100: number;
  currentVersion: number;
  geoHash: Hex;
  audit: { approved: boolean; fechaCorte: bigint; anchoredAt: bigint; fincaVersion: number };
  certId: bigint;
  cert: { issuedAt: bigint; expiresAt: bigint; revoked: boolean; fincaVersion: number };
  certUri: string;
}

export interface ChainEvent {
  name: string;
  args: Record<string, unknown>;
  blockNumber: bigint;
  logIndex: number;
  txHash: Hex;
  timestamp: bigint;
}

export interface LotHistory {
  lotId: bigint;
  node: LotNode;
  uri: string;
  nodes: Map<bigint, LotNode>;
  origins: Origin[];
  events: ChainEvent[];
}

const EVENTS_BY_LOT = [
  "HarvestRegistered",
  "LotProcessed",
  "LotDried",
  "HighMoistureWarning",
  "LotGraded",
  "CustodyTransferred",
  "LotSplit",
  "LotMerged",
  "LotExported",
] as const;

export const LOT_KIND = 1n;

export function parseLotId(raw: string): bigint | null {
  try {
    const id = BigInt(raw.trim());
    return id >> 248n === LOT_KIND ? id : null;
  } catch {
    return null;
  }
}

export function bytes32ToText(value: Hex): string {
  return /^0x0*$/.test(value) ? "" : hexToString(value, { size: 32 }).replace(/\0+$/, "");
}

export async function loadLotHistory(cfg: ChainConfig, lotId: bigint): Promise<LotHistory | null> {
  const chain = defineChain({
    id: cfg.chainId,
    name: `chain-${cfg.chainId}`,
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: { default: { http: [cfg.rpcUrl] } },
  });
  const client = createPublicClient({ chain, transport: http(cfg.rpcUrl) });
  const traceability = { address: cfg.traceability, abi: traceabilityAbi } as const;

  // 1. Árbol de linaje, nivel a nivel (cada nivel en paralelo).
  const nodes = new Map<bigint, LotNode>();
  let level: bigint[] = [lotId];
  while (level.length) {
    const fetched = await Promise.all(
      level.map(async (id) => {
        try {
          const [lot, parents, grams] = await Promise.all([
            client.readContract({ ...traceability, functionName: "getLot", args: [id] }),
            client.readContract({ ...traceability, functionName: "lineage", args: [id] }),
            client.readContract({ address: cfg.token, abi: tokenAbi, functionName: "totalSupply", args: [id] }),
          ]);
          return { id, lot: lot as Lot, parents, grams };
        } catch {
          return null; // LotNotFound
        }
      }),
    );
    if (!fetched[0] && nodes.size === 0) return null;
    level = [];
    for (const n of fetched) {
      if (!n || nodes.has(n.id)) continue;
      nodes.set(n.id, n);
      for (const p of n.parents) if (!nodes.has(p)) level.push(p);
    }
  }
  const ids = [...nodes.keys()];
  const roots = [...nodes.values()].filter((n) => n.parents.length === 0);
  const fromBlock = BigInt(cfg.fromBlock || "0");

  // 2. Eventos de fase de todos los lotes del árbol + URI + datos de origen, en paralelo.
  const byLot = EVENTS_BY_LOT.map((eventName) =>
    client.getContractEvents({ ...traceability, eventName, args: { lotId: ids }, fromBlock }),
  );
  const transformed = client.getContractEvents({ ...traceability, eventName: "LotTransformed", args: { toLotId: ids }, fromBlock });
  const uri = client.readContract({ address: cfg.token, abi: tokenAbi, functionName: "uri", args: [lotId] });

  const originKeys = [...new Map(roots.map((r) => [`${r.lot.fincaId}:${r.lot.ddsCertId}`, r.lot])).values()];
  const origins = Promise.all(
    originKeys.map(async (lot): Promise<Origin> => {
      const [finca, audit, cert, certUri] = await Promise.all([
        client.readContract({ address: cfg.origin, abi: originAbi, functionName: "getFinca", args: [lot.fincaId] }),
        client.readContract({ address: cfg.origin, abi: originAbi, functionName: "getLastAudit", args: [lot.fincaId] }),
        client.readContract({ address: cfg.origin, abi: originAbi, functionName: "getCertificate", args: [lot.ddsCertId] }),
        client.readContract({ address: cfg.token, abi: tokenAbi, functionName: "uri", args: [lot.ddsCertId] }),
      ]);
      return {
        fincaId: lot.fincaId,
        fincaVersion: lot.fincaVersion,
        areaHa100: finca.areaHa100,
        currentVersion: finca.version,
        geoHash: finca.geoHash,
        audit,
        certId: lot.ddsCertId,
        cert,
        certUri,
      };
    }),
  );

  const [logGroups, transformLogs, tokenUri, originList] = await Promise.all([Promise.all(byLot), transformed, uri, origins]);
  const logs = [...logGroups.flat(), ...transformLogs];

  // 3. Fecha de cada bloque (una llamada por bloque distinto).
  const blockNumbers = [...new Set(logs.map((l) => l.blockNumber))];
  const blocks = await Promise.all(blockNumbers.map((blockNumber) => client.getBlock({ blockNumber })));
  const ts = new Map(blocks.map((b) => [b.number, b.timestamp]));

  const seen = new Set<string>();
  const events: ChainEvent[] = [];
  for (const l of logs) {
    const key = `${l.transactionHash}:${l.logIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({
      name: l.eventName,
      args: l.args as Record<string, unknown>,
      blockNumber: l.blockNumber,
      logIndex: l.logIndex,
      txHash: l.transactionHash,
      timestamp: ts.get(l.blockNumber) ?? 0n,
    });
  }
  events.sort((a, b) => (a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1));

  return { lotId, node: nodes.get(lotId)!, uri: tokenUri, nodes, origins: originList, events };
}
