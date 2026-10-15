import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ABI_HASH } from "../src/lib/chain/abis.ts";
import {
  CONTRATOS,
  ErrorConfigCadena,
  FORMATO,
  GATEWAY_POR_DEFECTO,
  VARIABLES_OBSOLETAS,
  aConfigPublica,
  exigirAbiCompatible,
  huellaAbi,
  jsonCanonico,
  leerBloque,
  leerChainId,
  normalizarGateway,
  resolverConfigCadena,
  urlExplorador,
  validarDespliegue,
  validarRpc,
  variablesObsoletasPresentes,
  type CodigoErrorCadena,
  type ConfigCadena,
  type ContractName,
  type Despliegue,
} from "../src/lib/chain/config.ts";

// T02 · Configuración de red de HAFront (src/lib/chain/config.ts). 31337 es el archivo real que
// exporta HAContract; 80002 es un ejemplo con direcciones ficticias (aún no hay despliegue en Amoy).

const leer = (ruta: string) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), "utf8")) as Despliegue;
const LOCAL = leer("../src/lib/chain/deployments/31337.json");
const AMOY = leer("./fixtures/deployment-80002.json");
const REGISTRO = { 31337: LOCAL, 80002: AMOY };

/** Copia profunda modificada de un despliegue válido. */
function con(base: Despliegue, cambio: (d: Record<string, any>) => void): unknown {
  const d = structuredClone(base) as Record<string, any>;
  cambio(d);
  return d;
}

function codigo(fn: () => unknown): CodigoErrorCadena {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof ErrorConfigCadena, String(e));
    return e.codigo;
  }
  assert.fail("no lanzó");
}

function detalle(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as ErrorConfigCadena).detalle;
  }
  assert.fail("no lanzó");
}

describe("huellaAbi y jsonCanonico", () => {
  it("coinciden con el abiHash que calcula HAContract y con ABI_HASH de abis.ts", () => {
    for (const n of CONTRATOS) {
      assert.equal(huellaAbi(LOCAL.abi[n]), LOCAL.contracts[n].abiHash);
      assert.equal(LOCAL.contracts[n].abiHash, ABI_HASH[n]);
    }
  });

  it("ordena las claves y omite las indefinidas", () => {
    assert.equal(jsonCanonico({ b: 1, a: [{ d: undefined, c: "é" }] }), '{"a":[{"c":"é"}],"b":1}');
  });
});

describe("validarDespliegue", () => {
  it("acepta el 31337 exportado y el ejemplo de 80002", () => {
    assert.equal(validarDespliegue(LOCAL, 31337).format, FORMATO);
    assert.equal(validarDespliegue(AMOY, 80002).startBlock, 27100421);
  });

  it("formato distinto: FORMATO_NO_SOPORTADO", () => {
    assert.equal(codigo(() => validarDespliegue(con(LOCAL, (d) => (d.format = "huellaaltura.deployment/2")), 31337)), "FORMATO_NO_SOPORTADO");
    assert.equal(codigo(() => validarDespliegue(con(LOCAL, (d) => delete d.format), 31337)), "FORMATO_NO_SOPORTADO");
  });

  it("chainId del JSON distinto del archivo: CHAIN_ID_NO_COINCIDE", () => {
    assert.equal(codigo(() => validarDespliegue(LOCAL, 80002)), "CHAIN_ID_NO_COINCIDE");
  });

  const invalidos: [string, Despliegue, number, (d: Record<string, any>) => void, string][] = [
    ["raíz nula", LOCAL, 31337, () => {}, "(raíz)"],
    ["chainId decimal", LOCAL, 31337, (d) => (d.chainId = 1.5), "chainId"],
    ["chainId 0", LOCAL, 31337, (d) => (d.chainId = 0), "chainId"],
    ["sin network", LOCAL, 31337, (d) => (d.network = ""), "network"],
    ["sin chain", LOCAL, 31337, (d) => delete d.chain, "chain"],
    ["chain sin nombre", LOCAL, 31337, (d) => delete d.chain.name, "chain.name"],
    ["moneda ausente", LOCAL, 31337, (d) => delete d.chain.nativeCurrency, "chain.nativeCurrency"],
    ["moneda sin name", LOCAL, 31337, (d) => (d.chain.nativeCurrency.name = ""), "chain.nativeCurrency"],
    ["moneda sin symbol", LOCAL, 31337, (d) => delete d.chain.nativeCurrency.symbol, "chain.nativeCurrency"],
    ["decimales negativos", LOCAL, 31337, (d) => (d.chain.nativeCurrency.decimals = -1), "chain.nativeCurrency"],
    ["kind desconocido", LOCAL, 31337, (d) => (d.chain.kind = "otra"), "chain.kind"],
    ["kind local fuera de Hardhat", AMOY, 80002, (d) => (d.chain.kind = "local"), "chain.kind"],
    ["kind testnet en Hardhat", LOCAL, 31337, (d) => (d.chain.kind = "testnet"), "chain.kind"],
    ["sin rpcUrl", LOCAL, 31337, (d) => delete d.chain.rpcUrl, "chain.rpcUrl"],
    ["rpcUrl http en Amoy", AMOY, 80002, (d) => (d.chain.rpcUrl = "http://rpc.ejemplo"), "chain.rpcUrl"],
    ["sin explorerUrl", LOCAL, 31337, (d) => delete d.chain.explorerUrl, "chain.explorerUrl"],
    ["explorerUrl http", AMOY, 80002, (d) => (d.chain.explorerUrl = "http://amoy.ejemplo"), "chain.explorerUrl"],
    ["deployer no texto", LOCAL, 31337, (d) => (d.deployer = 1), "deployer"],
    ["admin con checksum incorrecto", LOCAL, 31337, (d) => (d.admin = "0xF39fd6e51aad88F6F4ce6aB8827279cffFb92266"), "admin"],
    ["sin deployedAt", LOCAL, 31337, (d) => delete d.deployedAt, "deployedAt"],
    ["startBlock -1", LOCAL, 31337, (d) => (d.startBlock = -1), "startBlock"],
    ["startBlock 1.5", LOCAL, 31337, (d) => (d.startBlock = 1.5), "startBlock"],
    ["contracts ausente", LOCAL, 31337, (d) => delete d.contracts, "contracts"],
    ["contrato de más", LOCAL, 31337, (d) => (d.contracts.Otro = d.contracts.CoffeeToken), "contracts"],
    ["contrato de menos", LOCAL, 31337, (d) => delete d.contracts.CoffeeToken, "contracts"],
    ["abi ausente", LOCAL, 31337, (d) => delete d.abi, "abi"],
    ["contrato nulo", LOCAL, 31337, (d) => (d.contracts.OriginRegistry = null), "contracts.OriginRegistry"],
    [
      "proxy en minúsculas",
      LOCAL,
      31337,
      (d) => (d.contracts.CoffeeToken.proxy = d.contracts.CoffeeToken.proxy.toLowerCase()),
      "contracts.CoffeeToken.proxy",
    ],
    ["implementación vacía", LOCAL, 31337, (d) => (d.contracts.CoffeeToken.implementation = ""), "contracts.CoffeeToken.implementation"],
    ["abiHash no texto", LOCAL, 31337, (d) => (d.contracts.CoffeeToken.abiHash = 1), "contracts.CoffeeToken.abiHash"],
    ["abiHash de 63 hex", LOCAL, 31337, (d) => (d.contracts.CoffeeToken.abiHash = "0x" + "a".repeat(63)), "contracts.CoffeeToken.abiHash"],
    ["abiHash de 65 hex", LOCAL, 31337, (d) => (d.contracts.CoffeeToken.abiHash = "0x" + "a".repeat(65)), "contracts.CoffeeToken.abiHash"],
    ["abiHash sin 0x", LOCAL, 31337, (d) => (d.contracts.CoffeeToken.abiHash = "a".repeat(64)), "contracts.CoffeeToken.abiHash"],
    ["abi no array", LOCAL, 31337, (d) => (d.abi.CoffeeToken = {}), "abi.CoffeeToken"],
    ["abi vacío", LOCAL, 31337, (d) => (d.abi.CoffeeToken = []), "abi.CoffeeToken"],
    ["abi distinto de su abiHash", LOCAL, 31337, (d) => d.abi.TraceabilityController.pop(), "abi.TraceabilityController"],
    ["sin generatedBy", LOCAL, 31337, (d) => delete d.generatedBy, "generatedBy"],
    ["generatedBy sin tool", LOCAL, 31337, (d) => (d.generatedBy.tool = ""), "generatedBy"],
    ["generatedBy sin commit", LOCAL, 31337, (d) => delete d.generatedBy.commit, "generatedBy"],
    ["generatedBy sin at", LOCAL, 31337, (d) => delete d.generatedBy.at, "generatedBy"],
  ];
  for (const [nombre, base, id, cambio, ruta] of invalidos) {
    it(`${nombre}: DESPLIEGUE_INVALIDO en ${ruta}`, () => {
      const raw = nombre === "raíz nula" ? null : con(base, cambio);
      assert.equal(codigo(() => validarDespliegue(raw, id)), "DESPLIEGUE_INVALIDO");
      assert.ok(detalle(() => validarDespliegue(raw, id)).startsWith(`deployments/${id}.json: ${ruta} `));
    });
  }

  it("un array no es un despliegue", () => {
    assert.equal(codigo(() => validarDespliegue([], 31337)), "DESPLIEGUE_INVALIDO");
  });
});

describe("leerChainId (valores límite)", () => {
  it("ausente o vacío: CHAIN_ID_AUSENTE con las redes disponibles", () => {
    assert.equal(codigo(() => leerChainId(undefined)), "CHAIN_ID_AUSENTE");
    assert.equal(detalle(() => leerChainId("", [31337, 80002])), "Define PUBLIC_CHAIN_ID (redes disponibles: 31337, 80002)");
    assert.equal(detalle(() => leerChainId(undefined)), "Define PUBLIC_CHAIN_ID (redes disponibles: ninguna)");
  });

  it("acepta del 1 al máximo entero seguro", () => {
    assert.equal(leerChainId("1"), 1);
    assert.equal(leerChainId("80002"), 80002);
    assert.equal(leerChainId("9007199254740991"), Number.MAX_SAFE_INTEGER);
  });

  for (const v of ["abc", "0", "00", "-1", "1.5", "0x7a69", "031337", " 31337", "9007199254740992", "12345678901234567"]) {
    it(`"${v}": CHAIN_ID_INVALIDO`, () => {
      assert.equal(codigo(() => leerChainId(v)), "CHAIN_ID_INVALIDO");
    });
  }
});

describe("validarRpc", () => {
  it("https en cualquier red y http solo en la local", () => {
    assert.equal(validarRpc("https://rpc.ejemplo", "testnet"), "https://rpc.ejemplo");
    assert.equal(validarRpc("http://127.0.0.1:9545", "local"), "http://127.0.0.1:9545");
  });

  it("http fuera de la red local: RPC_INSEGURO", () => {
    assert.equal(codigo(() => validarRpc("http://rpc.ejemplo", "testnet")), "RPC_INSEGURO");
    assert.equal(codigo(() => validarRpc("http://rpc.ejemplo", "mainnet")), "RPC_INSEGURO");
  });

  it("URL mal formada u otro protocolo: RPC_INVALIDO", () => {
    assert.equal(codigo(() => validarRpc("no-es-url", "local")), "RPC_INVALIDO");
    assert.equal(codigo(() => validarRpc("ftp://x", "local")), "RPC_INVALIDO");
    assert.equal(codigo(() => validarRpc("ws://127.0.0.1:8546", "local")), "RPC_INVALIDO");
  });
});

describe("normalizarGateway", () => {
  it("sin valor usa el gateway por defecto", () => {
    assert.equal(normalizarGateway(undefined), GATEWAY_POR_DEFECTO);
    assert.equal(normalizarGateway(""), GATEWAY_POR_DEFECTO);
  });

  it("añade la barra final si falta", () => {
    assert.equal(normalizarGateway("https://x/ipfs"), "https://x/ipfs/");
    assert.equal(normalizarGateway("https://ipfs.io/ipfs/"), "https://ipfs.io/ipfs/");
  });

  it("http solo a localhost o 127.0.0.1", () => {
    assert.equal(normalizarGateway("http://localhost:8080/ipfs/"), "http://localhost:8080/ipfs/");
    assert.equal(normalizarGateway("http://127.0.0.1:8080/ipfs"), "http://127.0.0.1:8080/ipfs/");
  });

  for (const v of ["http://gateway.ejemplo/ipfs/", "no-es-url", "ftp://localhost/ipfs/"]) {
    it(`"${v}": GATEWAY_INVALIDO`, () => {
      assert.equal(codigo(() => normalizarGateway(v)), "GATEWAY_INVALIDO");
    });
  }
});

describe("leerBloque (valores límite)", () => {
  it("sin valor usa el bloque del JSON", () => {
    assert.equal(leerBloque(undefined, 27100421), 27100421n);
    assert.equal(leerBloque("", 2), 2n);
  });

  it("de 0 a 15 dígitos", () => {
    assert.equal(leerBloque("0", 9), 0n);
    assert.equal(leerBloque("999999999999999", 9), 999999999999999n);
  });

  for (const v of ["1000000000000000", "-1", "1.0", "1e6", "abc", "-3"]) {
    it(`"${v}": BLOQUE_INVALIDO`, () => {
      assert.equal(codigo(() => leerBloque(v, 0)), "BLOQUE_INVALIDO");
    });
  }
});

describe("resolverConfigCadena (tabla de decisión 8.2)", () => {
  const resolver = (
    env: Record<string, string>,
    registro: Record<number, unknown> = REGISTRO,
    hashes: Record<ContractName, string> = ABI_HASH,
  ) =>
    resolverConfigCadena(env, registro, hashes);

  it("sin PUBLIC_CHAIN_ID: CHAIN_ID_AUSENTE", () => {
    assert.equal(codigo(() => resolver({})), "CHAIN_ID_AUSENTE");
    assert.equal(detalle(() => resolver({ PUBLIC_CHAIN_ID: "" })), "Define PUBLIC_CHAIN_ID (redes disponibles: 31337, 80002)");
  });

  it("PUBLIC_CHAIN_ID mal formado: CHAIN_ID_INVALIDO", () => {
    assert.equal(codigo(() => resolver({ PUBLIC_CHAIN_ID: "0x7a69" })), "CHAIN_ID_INVALIDO");
  });

  it("red sin JSON: RED_SIN_DESPLIEGUE con las redes disponibles", () => {
    assert.equal(codigo(() => resolver({ PUBLIC_CHAIN_ID: "1" })), "RED_SIN_DESPLIEGUE");
    assert.match(detalle(() => resolver({ PUBLIC_CHAIN_ID: "1" })), /redes disponibles: 31337, 80002/);
    assert.match(detalle(() => resolver({ PUBLIC_CHAIN_ID: "1" }, {})), /redes disponibles: ninguna/);
  });

  it("errores del JSON se propagan", () => {
    const formato = con(LOCAL, (d) => (d.format = "huellaaltura.deployment/2"));
    assert.equal(codigo(() => resolver({ PUBLIC_CHAIN_ID: "31337" }, { 31337: formato })), "FORMATO_NO_SOPORTADO");
    const minus = con(LOCAL, (d) => (d.contracts.CoffeeToken.proxy = d.contracts.CoffeeToken.proxy.toLowerCase()));
    assert.match(detalle(() => resolver({ PUBLIC_CHAIN_ID: "31337" }, { 31337: minus })), /contracts\.CoffeeToken\.proxy/);
    assert.equal(codigo(() => resolver({ PUBLIC_CHAIN_ID: "31337" }, { 31337: AMOY })), "CHAIN_ID_NO_COINCIDE");
  });

  it("31337 sin opcionales: RPC del JSON, gateway por defecto, fromBlock = startBlock, todo compatible", () => {
    const cfg = resolver({ PUBLIC_CHAIN_ID: "31337" });
    assert.equal(cfg.rpcUrl, LOCAL.chain.rpcUrl);
    assert.equal(cfg.ipfsGateway, GATEWAY_POR_DEFECTO);
    assert.equal(cfg.fromBlock, BigInt(LOCAL.startBlock));
    assert.deepEqual(cfg.abiCompatible, { CoffeeToken: true, OriginRegistry: true, TraceabilityController: true });
    assert.equal(cfg.contratos.TraceabilityController, LOCAL.contracts.TraceabilityController.proxy);
    assert.deepEqual(cfg.origen, { deployedAt: LOCAL.deployedAt, commit: LOCAL.generatedBy.commit });
    assert.equal("rpcUrl" in cfg.chain, false);
  });

  it("31337 con opcionales: RPC sustituido, gateway con / final, fromBlock 5", () => {
    const cfg = resolver({
      PUBLIC_CHAIN_ID: "31337",
      PUBLIC_RPC_URL: "http://127.0.0.1:9545",
      PUBLIC_IPFS_GATEWAY: "https://ipfs.io/ipfs",
      PUBLIC_FROM_BLOCK: "5",
    });
    assert.equal(cfg.rpcUrl, "http://127.0.0.1:9545");
    assert.equal(cfg.ipfsGateway, "https://ipfs.io/ipfs/");
    assert.equal(cfg.fromBlock, 5n);
  });

  it("80002: RPC http, gateway http y bloque inválido", () => {
    assert.equal(codigo(() => resolver({ PUBLIC_CHAIN_ID: "80002", PUBLIC_RPC_URL: "http://rpc.ejemplo" })), "RPC_INSEGURO");
    assert.equal(codigo(() => resolver({ PUBLIC_CHAIN_ID: "80002", PUBLIC_RPC_URL: "ftp://x" })), "RPC_INVALIDO");
    assert.equal(codigo(() => resolver({ PUBLIC_CHAIN_ID: "80002", PUBLIC_RPC_URL: "no-es-url" })), "RPC_INVALIDO");
    assert.equal(
      codigo(() => resolver({ PUBLIC_CHAIN_ID: "80002", PUBLIC_IPFS_GATEWAY: "http://gateway.ejemplo/ipfs/" })),
      "GATEWAY_INVALIDO",
    );
    for (const b of ["-3", "1e6", "abc"]) {
      assert.equal(codigo(() => resolver({ PUBLIC_CHAIN_ID: "80002", PUBLIC_FROM_BLOCK: b })), "BLOQUE_INVALIDO");
    }
  });

  it("80002 con el ABI de TraceabilityController distinto: lectura sigue, marcada incompatible", () => {
    const cfg = resolver({ PUBLIC_CHAIN_ID: "80002" }, REGISTRO, { ...ABI_HASH, TraceabilityController: "0x" + "0".repeat(64) });
    assert.deepEqual(cfg.abiCompatible, { CoffeeToken: true, OriginRegistry: true, TraceabilityController: false });
    assert.equal(aConfigPublica(cfg).abiCompatible, false);
    assert.equal(cfg.fromBlock, 27100421n);
    assert.equal(cfg.chain.kind, "testnet");
  });

  it("los otros dos contratos también se comparan", () => {
    const cfg = resolver({ PUBLIC_CHAIN_ID: "31337" }, REGISTRO, {
      ...ABI_HASH,
      CoffeeToken: "0x" + "1".repeat(64),
      OriginRegistry: "0x" + "2".repeat(64),
    });
    assert.deepEqual(cfg.abiCompatible, { CoffeeToken: false, OriginRegistry: false, TraceabilityController: true });
  });
});

describe("aConfigPublica, exigirAbiCompatible y urlExplorador", () => {
  const amoy = () => resolverConfigCadena({ PUBLIC_CHAIN_ID: "80002" }, REGISTRO, ABI_HASH);

  it("ConfigPublica tiene exactamente la forma de ChainConfig más red y abiCompatible", () => {
    const p = aConfigPublica(amoy());
    assert.deepEqual(Object.keys(p).sort(), [
      "abiCompatible", "chainId", "fromBlock", "ipfsGateway", "origin", "red", "rpcUrl", "token", "traceability",
    ]);
    assert.deepEqual(p.red, {
      name: "Polygon Amoy",
      kind: "testnet",
      explorerUrl: "https://amoy.polygonscan.com",
      nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    });
    assert.equal(p.fromBlock, "27100421");
    assert.equal(p.traceability, AMOY.contracts.TraceabilityController.proxy);
    assert.equal(p.origin, AMOY.contracts.OriginRegistry.proxy);
    assert.equal(p.token, AMOY.contracts.CoffeeToken.proxy);
    assert.equal(p.abiCompatible, true);
    const texto = JSON.stringify(p);
    for (const fuera of ["deployer", "admin", "abi\"", "stateMutability"]) assert.equal(texto.includes(fuera), false, fuera);
  });

  it("exigirAbiCompatible deja pasar un ABI igual y bloquea uno distinto", () => {
    const cfg = amoy();
    assert.doesNotThrow(() => exigirAbiCompatible(cfg, "TraceabilityController"));
    const distinto: ConfigCadena = { ...cfg, abiCompatible: { ...cfg.abiCompatible, TraceabilityController: false } };
    assert.equal(codigo(() => exigirAbiCompatible(distinto, "TraceabilityController")), "ABI_INCOMPATIBLE");
    assert.match(detalle(() => exigirAbiCompatible(distinto, "TraceabilityController")), /TraceabilityController en Polygon Amoy/);
  });

  it("urlExplorador arma tx, address y block, y devuelve null sin explorador", () => {
    const cfg = amoy();
    assert.equal(urlExplorador(cfg, "tx", "0xabc"), "https://amoy.polygonscan.com/tx/0xabc");
    assert.equal(urlExplorador(cfg, "address", "0x1"), "https://amoy.polygonscan.com/address/0x1");
    assert.equal(urlExplorador({ chain: { explorerUrl: "https://polygonscan.com/" } }, "block", "7"), "https://polygonscan.com/block/7");
    assert.equal(urlExplorador({ chain: { explorerUrl: "" } }, "tx", "0xabc"), null);
  });
});

describe("variablesObsoletasPresentes", () => {
  it("devuelve las variables de dirección anteriores a T02 que tienen valor", () => {
    assert.deepEqual(variablesObsoletasPresentes({}), []);
    assert.deepEqual(variablesObsoletasPresentes({ PUBLIC_TOKEN_ADDRESS: "", PUBLIC_CHAIN_ID: "31337" }), []);
    assert.deepEqual(
      variablesObsoletasPresentes({ PUBLIC_TRACEABILITY_ADDRESS: "0x1", PUBLIC_TOKEN_ADDRESS: "0x2" }),
      ["PUBLIC_TRACEABILITY_ADDRESS", "PUBLIC_TOKEN_ADDRESS"],
    );
    assert.equal(VARIABLES_OBSOLETAS.length, 3);
  });
});
