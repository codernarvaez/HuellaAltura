import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  encodeAbiParameters,
  encodeErrorResult,
  encodeEventTopics,
  encodeFunctionResult,
  keccak256,
  numberToHex,
  stringToBytes,
  stringToHex,
  type Address,
  type EIP1193Provider,
  type Hex,
} from "viem";
import { coffeeTokenAbi, traceabilityControllerAbi } from "../src/lib/chain/abis.ts";
import { ErrorFirma, ROLES, interpretarError, traducirErrorContrato } from "../src/lib/chain/errores.ts";
import { WalletSigner, ordenarWallets, type ConfigFirma, type PasoFirma, type WalletDetectada } from "../src/lib/chain/signer.ts";

// T03 · Adaptador de firma (src/lib/chain/signer.ts y errores.ts). La wallet es un proveedor
// EIP-1193 falso que registra cada método: así se comprueba que una llamada que revertiría
// nunca llega a eth_sendTransaction (criterio de aceptación de SCRUM-8).

const CONTROLADOR: Address = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const CUENTA: Address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const OTRA: Address = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const FINCA = keccak256(stringToBytes("finca-demo"));
const HASH_TX: Hex = `0x${"ab".repeat(32)}`;
const FARMER_ROLE = keccak256(stringToBytes("FARMER_ROLE"));
const LOTE = (1n << 248n) | 7n;

const CFG: ConfigFirma = {
  chainId: 31337,
  rpcUrl: "http://127.0.0.1:8545",
  traceability: CONTROLADOR,
  red: { name: "Hardhat local", kind: "local", explorerUrl: "", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } },
  abiCompatible: true,
};

const ARGS_COSECHA = [FINCA, CUENTA, 12_500n, stringToHex("Typica", { size: 32 }), 0, 1_760_000_000n, "bafy-cosecha"] as const;

type Manejador = (params: unknown[]) => unknown;

/** Proveedor EIP-1193 falso. `fallar` lanza como lo hace una wallet: { code, message, data }. */
function walletFalsa(manejadores: Record<string, Manejador>, chainIdInicial = 31337) {
  const llamadas: string[] = [];
  let chainId = chainIdInicial;
  const base: Record<string, Manejador> = {
    eth_requestAccounts: () => [CUENTA],
    eth_accounts: () => [CUENTA],
    eth_chainId: () => numberToHex(chainId),
    wallet_switchEthereumChain: (p) => {
      chainId = Number((p[0] as { chainId: Hex }).chainId);
      return null;
    },
    eth_blockNumber: () => "0x10",
    eth_getTransactionReceipt: () => null,
  };
  const proveedor = {
    async request({ method, params }: { method: string; params?: unknown[] }) {
      llamadas.push(method);
      const h = manejadores[method] ?? base[method];
      if (!h) throw { code: -32601, message: `método no soportado en la prueba: ${method}` };
      return h(params ?? []);
    },
    on() {},
    removeListener() {},
  } as unknown as EIP1193Provider;
  return { proveedor, llamadas, cambiarRed: (id: number) => (chainId = id) };
}

const revert = (data: Hex) => () => {
  throw { code: 3, message: "execution reverted", data };
};

describe("traducirErrorContrato", () => {
  it("nombra el rol que falta en español", () => {
    const m = traducirErrorContrato("AccessControlUnauthorizedAccount", [CUENTA, FARMER_ROLE]);
    assert.equal(m, "La cuenta 0x7099…79C8 no tiene el rol de productor en el contrato.");
  });

  it("conoce los ocho roles de HuellaAccess y CoffeeToken", () => {
    assert.deepEqual(Object.values(ROLES).sort(), [
      "administrador", "auditor", "catador", "controlador", "exportador", "procesador", "productor", "relayer",
    ]);
  });

  it("muestra el estado actual del lote", () => {
    assert.equal(
      traducirErrorContrato("InvalidState", [LOTE, 2]),
      "El lote está secado: esta acción no corresponde a ese estado.",
    );
  });

  it("expresa la masa en kg y distingue el caso cero", () => {
    assert.equal(traducirErrorContrato("InvalidMass", [0n, 0n]), "La cantidad debe ser mayor que cero.");
    assert.match(traducirErrorContrato("InvalidMass", [1_500n, 2_000n]), /2 kg\) supera el saldo disponible \(1,5 kg\)/);
  });

  it("todo error personalizado del controlador tiene mensaje propio", () => {
    const sinTraducir = ["AddressEmptyCode", "ERC1967InvalidImplementation", "ERC1967NonPayable", "FailedCall",
      "InvalidInitialization", "NotInitializing", "UUPSUnauthorizedCallContext", "UUPSUnsupportedProxiableUUID",
      "AccessControlBadConfirmation"]; // solo los dispara el admin o el upgrade, nunca una vista
    for (const e of traceabilityControllerAbi) {
      if (e.type !== "error" || sinTraducir.includes(e.name)) continue;
      assert.doesNotMatch(traducirErrorContrato(e.name, [0n, 0n]), /rechazó la operación \(/, e.name);
    }
  });

  it("un error desconocido conserva su nombre", () => {
    assert.equal(traducirErrorContrato("Inventado"), "El contrato rechazó la operación (Inventado).");
  });
});

describe("WalletSigner.send", () => {
  it("una llamada que revertiría muestra el error en español y no pide la firma", async () => {
    const data = encodeErrorResult({
      abi: traceabilityControllerAbi,
      errorName: "AccessControlUnauthorizedAccount",
      args: [CUENTA, FARMER_ROLE],
    });
    const w = walletFalsa({ eth_call: revert(data) });
    const pasos: PasoFirma[] = [];
    const signer = new WalletSigner(CFG, w.proveedor);

    await assert.rejects(signer.send("registerHarvest", ARGS_COSECHA, { alPaso: (p) => pasos.push(p) }), (err) => {
      assert.ok(err instanceof ErrorFirma);
      assert.equal(err.codigo, "REVERTIRIA");
      assert.equal(err.message, "La cuenta 0x7099…79C8 no tiene el rol de productor en el contrato.");
      assert.deepEqual(err.contrato, { nombre: "AccessControlUnauthorizedAccount", args: [CUENTA, FARMER_ROLE] });
      return true;
    });
    assert.deepEqual(pasos, ["conectando", "red", "simulando"]);
    assert.ok(w.llamadas.includes("eth_call"));
    assert.ok(!w.llamadas.includes("eth_sendTransaction"), "la wallet no debe recibir la transacción");
  });

  it("decodifica los errores que el controlador propaga desde CoffeeToken", async () => {
    const data = encodeErrorResult({
      abi: coffeeTokenAbi,
      errorName: "ERC1155InsufficientBalance",
      args: [CUENTA, 1_000n, 3_000n, LOTE],
    });
    const signer = new WalletSigner(CFG, walletFalsa({ eth_call: revert(data) }).proveedor);
    await assert.rejects(signer.send("transferCustody", [LOTE, CUENTA, OTRA, 3_000n, HASH_TX, "bafy"]), {
      name: "ErrorFirma",
      codigo: "REVERTIRIA",
      message: "Saldo insuficiente: hay 1 kg y se necesitan 3 kg.",
    });
  });

  it("si el usuario rechaza la conexión no se simula ni se firma", async () => {
    const w = walletFalsa({
      eth_requestAccounts: () => {
        throw { code: 4001, message: "User rejected the request." };
      },
    });
    await assert.rejects(new WalletSigner(CFG, w.proveedor).send("registerHarvest", ARGS_COSECHA), {
      codigo: "RECHAZADO",
      message: "Cancelaste la solicitud en la wallet.",
    });
    assert.deepEqual(w.llamadas, ["eth_requestAccounts"]);
  });

  it("si el usuario rechaza la firma devuelve RECHAZADO", async () => {
    const lotId = encodeFunctionResult({ abi: traceabilityControllerAbi, functionName: "registerHarvest", result: LOTE });
    const w = walletFalsa({
      eth_call: () => lotId,
      eth_sendTransaction: () => {
        throw { code: 4001, message: "User denied transaction signature." };
      },
    });
    await assert.rejects(new WalletSigner(CFG, w.proveedor).send("registerHarvest", ARGS_COSECHA), { codigo: "RECHAZADO" });
  });

  it("cambia de red antes de simular y agrega la red si la wallet no la conoce", async () => {
    let conoce = false;
    const lotId = encodeFunctionResult({ abi: traceabilityControllerAbi, functionName: "registerHarvest", result: LOTE });
    const w = walletFalsa(
      {
        wallet_switchEthereumChain: () => {
          if (!conoce) throw { code: 4902, message: "Unrecognized chain ID" };
          w.cambiarRed(31337);
          return null;
        },
        wallet_addEthereumChain: (p) => {
          const red = p[0] as { chainId: Hex; chainName: string; rpcUrls: string[]; nativeCurrency: { symbol: string } };
          assert.equal(red.chainId, "0x7a69");
          assert.equal(red.chainName, "Hardhat local");
          assert.deepEqual(red.rpcUrls, ["http://127.0.0.1:8545"]);
          assert.equal(red.nativeCurrency.symbol, "ETH");
          conoce = true;
          return null;
        },
        eth_call: () => lotId,
        eth_sendTransaction: () => {
          throw { code: 4001, message: "rechazada" };
        },
      },
      80002,
    );
    await assert.rejects(new WalletSigner(CFG, w.proveedor).send("registerHarvest", ARGS_COSECHA), { codigo: "RECHAZADO" });
    const i = (m: string) => w.llamadas.indexOf(m);
    assert.ok(i("wallet_addEthereumChain") > i("wallet_switchEthereumChain"));
    assert.ok(w.llamadas.lastIndexOf("wallet_switchEthereumChain") > i("wallet_addEthereumChain"));
    assert.ok(i("eth_call") > w.llamadas.lastIndexOf("wallet_switchEthereumChain"), "simula ya en la red correcta");
  });

  it("si la wallet sigue en otra red no simula", async () => {
    const w = walletFalsa({ wallet_switchEthereumChain: () => null }, 1);
    await assert.rejects(new WalletSigner(CFG, w.proveedor).send("registerHarvest", ARGS_COSECHA), {
      codigo: "RED_INCORRECTA",
      message: "La wallet sigue en la red 1; cámbiala a Hardhat local (31337) para continuar.",
    });
    assert.ok(!w.llamadas.includes("eth_call"));
  });

  it("con un ABI incompatible no toca la wallet", async () => {
    const w = walletFalsa({});
    await assert.rejects(new WalletSigner({ ...CFG, abiCompatible: false }, w.proveedor).send("registerHarvest", ARGS_COSECHA), {
      codigo: "ABI_INCOMPATIBLE",
    });
    assert.deepEqual(w.llamadas, []);
  });

  it("envía, espera el recibo y devuelve los eventos del controlador", async () => {
    const lotId = encodeFunctionResult({ abi: traceabilityControllerAbi, functionName: "registerHarvest", result: LOTE });
    const topics = encodeEventTopics({
      abi: traceabilityControllerAbi,
      eventName: "HarvestRegistered",
      args: { lotId: LOTE, fincaId: FINCA, holder: CUENTA },
    });
    const data = encodeAbiParameters(
      [{ type: "uint256" }, { type: "bytes32" }, { type: "uint8" }, { type: "uint256" }, { type: "string" }],
      [12_500n, ARGS_COSECHA[3], 0, (2n << 248n) | 1n, "bafy-cosecha"],
    );
    const log = (address: Address, t: readonly Hex[], d: Hex, logIndex: number) => ({
      address, topics: t, data: d, blockNumber: "0x10", blockHash: `0x${"cd".repeat(32)}`,
      transactionHash: HASH_TX, transactionIndex: "0x0", logIndex: numberToHex(logIndex), removed: false,
    });
    let enviada: Record<string, unknown> | undefined;
    const w = walletFalsa({
      eth_call: () => lotId,
      eth_sendTransaction: (p) => {
        enviada = p[0] as Record<string, unknown>;
        return HASH_TX;
      },
      eth_getTransactionReceipt: () => ({
        transactionHash: HASH_TX, transactionIndex: "0x0", blockHash: `0x${"cd".repeat(32)}`, blockNumber: "0x10",
        from: CUENTA, to: CONTROLADOR, cumulativeGasUsed: "0x1", gasUsed: "0x1", effectiveGasPrice: "0x1",
        contractAddress: null, status: "0x1", type: "0x2", logsBloom: `0x${"00".repeat(256)}`,
        logs: [
          // Un TransferSingle del token no es del controlador: se descarta.
          log("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", [`0x${"11".repeat(32)}`], "0x", 0),
          log(CONTROLADOR, topics as Hex[], data, 1),
        ],
      }),
    });
    const pasos: PasoFirma[] = [];
    const r = await new WalletSigner(CFG, w.proveedor).send("registerHarvest", ARGS_COSECHA, { alPaso: (p) => pasos.push(p) });

    assert.deepEqual(pasos, ["conectando", "red", "simulando", "firmando", "confirmando"]);
    assert.equal(r.hash, HASH_TX);
    assert.equal(r.cuenta, CUENTA);
    assert.equal(r.bloque, 16n);
    assert.equal(r.eventos.length, 1);
    const ev = r.eventos[0]!;
    assert.equal(ev.eventName, "HarvestRegistered");
    assert.equal((ev.args as { lotId: bigint }).lotId, LOTE);
    assert.equal(enviada?.to, CONTROLADOR);
    assert.equal(String(enviada?.from).toLowerCase(), CUENTA.toLowerCase());
  });

  it("una transacción minada que revierte da REVERTIDA", async () => {
    const lotId = encodeFunctionResult({ abi: traceabilityControllerAbi, functionName: "registerHarvest", result: LOTE });
    const w = walletFalsa({
      eth_call: () => lotId,
      eth_sendTransaction: () => HASH_TX,
      eth_getTransactionReceipt: () => ({
        transactionHash: HASH_TX, transactionIndex: "0x0", blockHash: `0x${"cd".repeat(32)}`, blockNumber: "0x10",
        from: CUENTA, to: CONTROLADOR, cumulativeGasUsed: "0x1", gasUsed: "0x1", effectiveGasPrice: "0x1",
        contractAddress: null, status: "0x0", type: "0x2", logsBloom: `0x${"00".repeat(256)}`, logs: [],
      }),
    });
    await assert.rejects(new WalletSigner(CFG, w.proveedor).send("registerHarvest", ARGS_COSECHA), { codigo: "REVERTIDA" });
  });
});

describe("interpretarError y ordenarWallets", () => {
  it("un error sin causa del contrato es RED con el detalle", () => {
    const e = interpretarError(new Error("fetch failed"));
    assert.equal(e.codigo, "RED");
    assert.equal(e.message, "No se pudo completar la operación: fetch failed");
  });

  it("Rabby va primero, luego MetaMask y el resto por nombre", () => {
    const w = (nombre: string, rdns: string) => ({ nombre, rdns, icono: "", proveedor: {} }) as WalletDetectada;
    const orden = ordenarWallets([w("Zerion", "io.zerion"), w("MetaMask", "io.metamask"), w("Coinbase", "com.coinbase"), w("Rabby", "io.rabby")]);
    assert.deepEqual(orden.map((x) => x.nombre), ["Rabby", "MetaMask", "Coinbase", "Zerion"]);
  });
});
