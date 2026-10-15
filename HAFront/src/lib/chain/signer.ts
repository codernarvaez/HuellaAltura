import {
  BaseError,
  type Abi,
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  parseEventLogs,
  type Address,
  type Chain,
  type ContractFunctionArgs,
  type EIP1193Provider,
  type Hash,
  type Hex,
  type ParseEventLogsReturnType,
} from "viem";
import { traceabilityControllerAbi } from "./abis.ts";
import type { ConfigPublica } from "./config.ts";
import { ERRORES_ABI, ErrorFirma, interpretarError } from "./errores.ts";

// Adaptador de firma de las vistas de trazabilidad (T03, SCRUM-8, ADR-003). Las vistas llaman
// signer.send(acción, args) y no saben quién firma: WalletSigner firma con la wallet del rol
// (Rabby o MetaMask) y RelayerSigner (T22) enviará el job al chain-service. Solo navegador.

/** Funciones de fase del TraceabilityController que pueden llamar las vistas V2-V8. */
export const ACCIONES = [
  "registerHarvest",
  "logProcessing",
  "logDrying",
  "logHulling",
  "addCupping",
  "transferCustody",
  "split",
  "merge",
  "markExported",
] as const;

export type Accion = (typeof ACCIONES)[number];
export type ArgsAccion<A extends Accion> = ContractFunctionArgs<typeof traceabilityControllerAbi, "nonpayable", A>;

/** Pasos que ve el formulario; la simulación termina antes de pedir la firma. */
export type PasoFirma = "conectando" | "red" | "simulando" | "firmando" | "confirmando";

export interface OpcionesEnvio {
  alPaso?: (paso: PasoFirma) => void;
  /** Bloques que se esperan sobre el de la transacción (por defecto 1). */
  confirmaciones?: number;
}

export type EventoControlador = ParseEventLogsReturnType<typeof traceabilityControllerAbi>[number];

export interface ResultadoEnvio {
  hash: Hash;
  cuenta: Address;
  bloque: bigint;
  /** Eventos del controlador en el recibo: de aquí sale el lotId nuevo (HarvestRegistered, LotTransformed…). */
  eventos: EventoControlador[];
}

export interface ChainSigner {
  readonly modo: "wallet" | "relayer";
  send<A extends Accion>(accion: A, args: ArgsAccion<A>, opciones?: OpcionesEnvio): Promise<ResultadoEnvio>;
}

/** Lo que el signer necesita de ConfigPublica (data-config de la página). */
export type ConfigFirma = Pick<ConfigPublica, "chainId" | "rpcUrl" | "traceability" | "red" | "abiCompatible">;

/**
 * ABI del controlador con los errores del token y del registro, que el controlador propaga.
 * Tipado como Abi: send ya restringe acción y argumentos con ArgsAccion.
 */
const ABI_ENVIO: Abi = [...traceabilityControllerAbi.filter((e) => e.type !== "error"), ...ERRORES_ABI];

const CODIGO_RED_DESCONOCIDA = 4902;

export function cadenaViem(cfg: ConfigFirma): Chain {
  return defineChain({
    id: cfg.chainId,
    name: cfg.red.name,
    nativeCurrency: cfg.red.nativeCurrency,
    rpcUrls: { default: { http: [cfg.rpcUrl] } },
    ...(cfg.red.explorerUrl ? { blockExplorers: { default: { name: "Explorador", url: cfg.red.explorerUrl } } } : {}),
  });
}

function esRedDesconocida(err: unknown): boolean {
  const codigo = (e: unknown) => (e as { code?: unknown } | null)?.code;
  if (err instanceof BaseError) return !!err.walk((e) => codigo(e) === CODIGO_RED_DESCONOCIDA);
  return codigo(err) === CODIGO_RED_DESCONOCIDA;
}

/** Firma directa: la cuenta conectada en la wallet es msg.sender y debe tener el rol de la acción. */
export class WalletSigner implements ChainSigner {
  readonly modo = "wallet" as const;
  readonly #cfg: ConfigFirma;
  readonly #chain: Chain;
  readonly #wallet;
  readonly #lectura;

  constructor(cfg: ConfigFirma, proveedor: EIP1193Provider) {
    this.#cfg = cfg;
    this.#chain = cadenaViem(cfg);
    // Las lecturas van por la misma wallet: simulación y envío ven el mismo nodo y el mismo nonce.
    // Sin reintentos: un revert llega como -32603 en algunos nodos y viem lo repetiría tres veces.
    const transport = custom(proveedor, { retryCount: 0 });
    this.#wallet = createWalletClient({ chain: this.#chain, transport });
    this.#lectura = createPublicClient({ chain: this.#chain, transport, pollingInterval: 1_000 });
  }

  /** Pide acceso a la wallet y devuelve la cuenta activa. */
  async conectar(): Promise<Address> {
    let cuentas: Address[];
    try {
      cuentas = await this.#wallet.requestAddresses();
    } catch (err) {
      throw interpretarError(err);
    }
    if (!cuentas[0]) throw new ErrorFirma("SIN_CUENTA", "La wallet no tiene ninguna cuenta conectada.");
    return cuentas[0];
  }

  /** Cambia la wallet a la red configurada; si no la conoce, la agrega primero. */
  async asegurarRed(): Promise<void> {
    try {
      if ((await this.#wallet.getChainId()) === this.#chain.id) return;
      try {
        await this.#wallet.switchChain({ id: this.#chain.id });
      } catch (err) {
        if (!esRedDesconocida(err)) throw err;
        await this.#wallet.addChain({ chain: this.#chain });
        await this.#wallet.switchChain({ id: this.#chain.id });
      }
      const actual = await this.#wallet.getChainId();
      if (actual !== this.#chain.id) {
        throw new ErrorFirma(
          "RED_INCORRECTA",
          `La wallet sigue en la red ${actual}; cámbiala a ${this.#cfg.red.name} (${this.#chain.id}) para continuar.`,
        );
      }
    } catch (err) {
      throw interpretarError(err);
    }
  }

  async simular<A extends Accion>(accion: A, args: ArgsAccion<A>, opciones: OpcionesEnvio = {}): Promise<void> {
    await this.#preparar(accion, args, opciones.alPaso ?? (() => {}));
  }

  async send<A extends Accion>(accion: A, args: ArgsAccion<A>, opciones: OpcionesEnvio = {}): Promise<ResultadoEnvio> {
    const paso = opciones.alPaso ?? (() => {});
    const { cuenta, request } = await this.#preparar(accion, args, paso);

    paso("firmando");
    let hash: Hash;
    try {
      hash = await this.#wallet.writeContract(request);
    } catch (err) {
      throw interpretarError(err);
    }

    paso("confirmando");
    let recibo;
    try {
      recibo = await this.#lectura.waitForTransactionReceipt({ hash, confirmations: opciones.confirmaciones ?? 1 });
    } catch (err) {
      throw interpretarError(err);
    }
    if (recibo.status !== "success") {
      throw new ErrorFirma("REVERTIDA", `La transacción ${hash} se incluyó en el bloque pero el contrato la revirtió.`);
    }

    const propios = recibo.logs.filter((l) => l.address.toLowerCase() === this.#cfg.traceability.toLowerCase());
    return {
      hash,
      cuenta,
      bloque: recibo.blockNumber,
      eventos: parseEventLogs({ abi: traceabilityControllerAbi, logs: propios }),
    };
  }

  /** Conexión, red y simulación previa: si el contrato revertiría, el usuario ve el motivo y la wallet no se abre. */
  async #preparar(accion: Accion, args: unknown, paso: (p: PasoFirma) => void) {
    if (!this.#cfg.abiCompatible) {
      throw new ErrorFirma(
        "ABI_INCOMPATIBLE",
        `Los contratos de ${this.#cfg.red.name} no coinciden con esta versión de la aplicación; no se puede firmar.`,
      );
    }

    paso("conectando");
    const cuenta = await this.conectar();
    paso("red");
    await this.asegurarRed();

    paso("simulando");
    try {
      const { request } = await this.#lectura.simulateContract({
        address: this.#cfg.traceability,
        abi: ABI_ENVIO,
        functionName: accion,
        args: args as readonly unknown[],
        account: cuenta,
      });
      return { cuenta, request };
    } catch (err) {
      throw interpretarError(err, "simulacion");
    }
  }

  /** block.timestamp del último bloque de la red de la wallet, en segundos. */
  async horaDeLaCadena(): Promise<number> {
    try {
      return Number((await this.#lectura.getBlock()).timestamp);
    } catch (err) {
      throw interpretarError(err);
    }
  }

  /** Lectura del controlador con la misma wallet (p. ej. hasRole antes de mostrar el formulario). */
  async tieneRol(rol: Hex, cuenta: Address): Promise<boolean> {
    try {
      return await this.#lectura.readContract({
        address: this.#cfg.traceability,
        abi: traceabilityControllerAbi,
        functionName: "hasRole",
        args: [rol, cuenta],
      });
    } catch (err) {
      throw interpretarError(err);
    }
  }
}

// --- Descubrimiento de wallets (EIP-6963) -------------------------------------------------------

export interface WalletDetectada {
  nombre: string;
  icono: string; // data URI que entrega la wallet ("" si no hay)
  rdns: string; // p. ej. io.rabby, io.metamask
  proveedor: EIP1193Provider;
}

interface DetalleAnuncio {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: EIP1193Provider;
}

type ProveedorInyectado = EIP1193Provider & { isRabby?: boolean; isMetaMask?: boolean };

/** Rabby primero (lo recomienda ADR-003), luego MetaMask y el resto por nombre. */
export function ordenarWallets(lista: WalletDetectada[]): WalletDetectada[] {
  const peso = (w: WalletDetectada) => (w.rdns === "io.rabby" ? 0 : w.rdns === "io.metamask" ? 1 : 2);
  return [...lista].sort((a, b) => peso(a) - peso(b) || a.nombre.localeCompare(b.nombre));
}

/**
 * Wallets instaladas en el navegador. Usa EIP-6963 y, si ninguna responde en `esperaMs`,
 * window.ethereum. Varias extensiones a la vez ya no compiten por window.ethereum.
 */
export function descubrirWallets(esperaMs = 300): Promise<WalletDetectada[]> {
  if (typeof window === "undefined") return Promise.resolve([]);
  return new Promise((resolve) => {
    const porUuid = new Map<string, WalletDetectada>();
    const alAnunciar = (ev: Event) => {
      const { info, provider } = (ev as CustomEvent<DetalleAnuncio>).detail;
      porUuid.set(info.uuid, { nombre: info.name, icono: info.icon, rdns: info.rdns, proveedor: provider });
    };
    window.addEventListener("eip6963:announceProvider", alAnunciar);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", alAnunciar);
      const lista = [...porUuid.values()];
      const inyectado = window.ethereum as ProveedorInyectado | undefined;
      if (!lista.length && inyectado) {
        const nombre = inyectado.isRabby ? "Rabby" : inyectado.isMetaMask ? "MetaMask" : "Wallet del navegador";
        const rdns = inyectado.isRabby ? "io.rabby" : inyectado.isMetaMask ? "io.metamask" : "";
        lista.push({ nombre, icono: "", rdns, proveedor: inyectado });
      }
      resolve(ordenarWallets(lista));
    }, esperaMs);
  });
}

/** WalletSigner con la wallet preferida (o la indicada por rdns). SIN_WALLET si no hay ninguna. */
export async function crearWalletSigner(cfg: ConfigFirma, rdns?: string): Promise<WalletSigner> {
  const wallets = await descubrirWallets();
  const elegida = rdns ? wallets.find((w) => w.rdns === rdns) : wallets[0];
  if (!elegida) {
    throw new ErrorFirma("SIN_WALLET", "No se encontró una wallet en el navegador. Instala Rabby o MetaMask para firmar.");
  }
  return new WalletSigner(cfg, elegida.proveedor);
}
