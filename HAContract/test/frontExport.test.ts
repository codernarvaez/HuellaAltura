import { expect } from "chai";
import { artifacts, ethers } from "hardhat";
import { CONTRACT_NAMES, type ContractName, type Deployment, type DeploymentBase } from "../scripts/lib/deployments";
import {
  FORMAT,
  TOOL,
  abiHash,
  cambioRelevante,
  completar,
  comprobar,
  describirCommit,
  generarAbisTs,
  migrar,
  serializar,
  validarV1,
} from "../scripts/lib/frontExport";
import { ExportError, NETWORKS, chainMeta } from "../scripts/lib/networks";

// T02 · Exportación de ABI y direcciones a HAFront: funciones puras de scripts/lib/frontExport.ts.

const addr = (n: number) => ethers.getAddress("0x" + n.toString(16).padStart(40, "0"));
const AT = "2026-10-13T10:00:00.000Z";

let abis: Record<ContractName, readonly unknown[]>;
let base31337: DeploymentBase;
let base80002: DeploymentBase;

function legacy(b: DeploymentBase): Record<string, unknown> {
  // Formato anterior a T02: sin format, chain, startBlock, abiHash ni generatedBy.
  const { startBlock: _omit, ...rest } = structuredClone(b);
  return rest;
}

function codigo(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    expect(e).to.be.instanceOf(ExportError);
    return (e as ExportError).codigo;
  }
  throw new Error("no lanzó");
}

const v1 = (b: DeploymentBase, commit = "abc1234") => completar(b, chainMeta(b.chainId), commit, AT);
const texto = (d: unknown) => JSON.stringify(d, null, 2) + "\n";

before(async () => {
  abis = {} as Record<ContractName, readonly unknown[]>;
  for (const n of CONTRACT_NAMES) abis[n] = (await artifacts.readArtifact(n)).abi;
  const contracts = (o: number) =>
    Object.fromEntries(CONTRACT_NAMES.map((n, i) => [n, { proxy: addr(o + i), implementation: addr(o + 10 + i) }])) as DeploymentBase["contracts"];
  base31337 = {
    network: "localhost",
    chainId: 31337,
    deployer: addr(1),
    admin: addr(1),
    deployedAt: AT,
    startBlock: 2,
    contracts: contracts(100),
    abi: abis,
  };
  base80002 = { ...base31337, network: "amoy", chainId: 80002, startBlock: 27100421, contracts: contracts(200) };
});

describe("T02 · networks", () => {
  it("tiene 31337 local, 80002 de prueba y 137 principal, sin RPC con claves", () => {
    expect(chainMeta(31337).kind).to.equal("local");
    expect(chainMeta(80002)).to.include({ name: "Polygon Amoy", kind: "testnet", explorerUrl: "https://amoy.polygonscan.com" });
    expect(chainMeta(137).kind).to.equal("mainnet");
    for (const m of Object.values(NETWORKS)) expect(m.rpcUrl).to.not.match(/alchemy|infura|\/v2\//);
  });

  it("una red desconocida da EXP_RED_DESCONOCIDA", () => {
    expect(codigo(() => chainMeta(1))).to.equal("EXP_RED_DESCONOCIDA");
  });
});

describe("T02 · abiHash", () => {
  it("es keccak256 del JSON canónico: el orden de las claves no cambia la huella", () => {
    const a = [{ type: "function", name: "f", inputs: [] }];
    const b = [{ inputs: [], name: "f", type: "function" }];
    expect(abiHash(a)).to.match(/^0x[0-9a-f]{64}$/);
    expect(abiHash(a)).to.equal(abiHash(b));
    expect(abiHash(a)).to.not.equal(abiHash([{ ...a[0], name: "g" }]));
  });
});

describe("T02 · describirCommit", () => {
  it("sin git, limpio y con cambios sin commit", () => {
    expect(describirCommit(null, true)).to.equal("desconocido");
    expect(describirCommit("eddd5a79", false)).to.equal("eddd5a79");
    expect(describirCommit("eddd5a79", true)).to.equal("eddd5a79-dirty");
  });
});

describe("T02 · migrar", () => {
  it("rechaza lo que no es un despliegue", () => {
    expect(codigo(() => migrar(null, {}))).to.equal("EXP_JSON_INVALIDO");
    expect(codigo(() => migrar({ abi: {} }, {}))).to.equal("EXP_JSON_INVALIDO");
    expect(codigo(() => migrar({ contracts: {} }, {}))).to.equal("EXP_JSON_INVALIDO");
  });

  it("rechaza un formato distinto de v1", () => {
    expect(codigo(() => migrar({ ...v1(base31337), format: "huellaaltura.deployment/2" }, {}))).to.equal("EXP_JSON_INVALIDO");
  });

  it("v1: conserva startBlock y descarta los campos que recalcula la exportación", () => {
    const b = migrar(JSON.parse(texto(v1(base80002))), {});
    expect(b).to.deep.equal(base80002);
  });

  it("formato anterior en 31337: startBlock 0", () => {
    expect(migrar(legacy(base31337), {}).startBlock).to.equal(0);
  });

  it("formato anterior en otra red: usa START_BLOCK", () => {
    expect(migrar(legacy(base80002), { START_BLOCK: "27100421" }).startBlock).to.equal(27100421);
  });

  it("formato anterior en otra red sin START_BLOCK válido: EXP_SIN_BLOQUE_INICIAL", () => {
    expect(codigo(() => migrar(legacy(base80002), {}))).to.equal("EXP_SIN_BLOQUE_INICIAL");
    expect(codigo(() => migrar(legacy(base80002), { START_BLOCK: "-1" }))).to.equal("EXP_SIN_BLOQUE_INICIAL");
    expect(codigo(() => migrar(legacy(base80002), { START_BLOCK: "1234567890123456" }))).to.equal("EXP_SIN_BLOQUE_INICIAL");
  });

  it("un contrato ausente queda sin dirección (lo detecta después la validación)", () => {
    const raw = legacy(base31337) as { contracts: Record<string, unknown> };
    delete raw.contracts.CoffeeToken;
    expect(migrar(raw, {}).contracts.CoffeeToken).to.deep.equal({ proxy: undefined, implementation: undefined });
  });
});

describe("T02 · completar y serializar", () => {
  it("añade format, chain, abiHash y generatedBy en el orden del formato 4.1", () => {
    const d = v1(base80002);
    expect(Object.keys(d)).to.deep.equal([
      "format", "network", "chainId", "chain", "deployer", "admin", "deployedAt", "startBlock", "contracts", "abi", "generatedBy",
    ]);
    expect(d.format).to.equal(FORMAT);
    expect(d.chain).to.deep.equal(NETWORKS[80002]);
    expect(d.generatedBy).to.deep.equal({ tool: TOOL, commit: "abc1234", at: AT });
    for (const n of CONTRACT_NAMES) expect(d.contracts[n].abiHash).to.equal(abiHash(abis[n]));
  });

  it("serializa con 2 espacios y salto de línea final, y es válido para el esquema", () => {
    const s = serializar(v1(base80002));
    expect(s.endsWith("}\n")).to.equal(true);
    expect(s).to.contain('\n  "format": "huellaaltura.deployment/1"');
    expect(validarV1(s, "80002.json")).to.deep.equal([]);
    expect(validarV1(serializar(v1(base31337)), "31337.json")).to.deep.equal([]);
  });
});

describe("T02 · cambioRelevante", () => {
  const otro = (f: (d: Deployment) => void) => {
    const d = structuredClone(v1(base31337));
    f(d);
    return d;
  };

  it("sin copia previa hay que escribir", () => {
    expect(cambioRelevante(null, v1(base31337))).to.equal(true);
  });

  it("solo cambian deployedAt o generatedBy: no se reescribe", () => {
    const previo = otro((d) => {
      d.deployedAt = "2020-01-01T00:00:00.000Z";
      d.generatedBy.commit = "otro";
    });
    expect(cambioRelevante(previo, v1(base31337))).to.equal(false);
  });

  const casos: [string, (d: Deployment) => void][] = [
    ["formato", (d) => ((d as { format: string }).format = "x")],
    ["startBlock", (d) => (d.startBlock = 9)],
    ["red", (d) => (d.chain = { ...d.chain, rpcUrl: "http://127.0.0.1:9545" })],
    ["proxy", (d) => (d.contracts.OriginRegistry.proxy = addr(999))],
    ["implementación", (d) => (d.contracts.TraceabilityController.implementation = addr(999))],
    ["abiHash", (d) => (d.contracts.CoffeeToken.abiHash = "0x" + "0".repeat(64))],
    ["contrato ausente", (d) => delete (d.contracts as Partial<Deployment["contracts"]>).CoffeeToken],
    ["sin contracts", (d) => delete (d as Partial<Deployment>).contracts],
  ];
  for (const [nombre, f] of casos) {
    it(`cambia ${nombre}: se reescribe`, () => {
      expect(cambioRelevante(otro(f), v1(base31337))).to.equal(true);
    });
  }
});

describe("T02 · generarAbisTs", () => {
  it("genera los tres ABI as const, ABI_HASH y los alias, con cabecera de archivo generado", () => {
    const ts = generarAbisTs(abis);
    expect(ts.startsWith("// GENERADO por HAContract `npm run export:front`")).to.equal(true);
    expect(ts).to.contain("export const coffeeTokenAbi = [\n");
    expect(ts).to.contain("export const originRegistryAbi = [\n");
    expect(ts).to.contain("export const traceabilityControllerAbi = [\n");
    expect(ts.match(/\] as const;/g)).to.have.length(3);
    expect(ts).to.contain(`  TraceabilityController: "${abiHash(abis.TraceabilityController)}",`);
    expect(ts).to.contain("traceabilityControllerAbi as traceabilityAbi, originRegistryAbi as originAbi, coffeeTokenAbi as tokenAbi");
    expect(generarAbisTs(abis)).to.equal(ts);
  });
});

describe("T02 · validarV1", () => {
  const archivo = "80002.json";
  const con = (f: (d: Deployment) => void) => {
    const d = structuredClone(v1(base80002));
    f(d);
    return texto(d);
  };

  it("JSON mal formado", () => {
    expect(validarV1("{", archivo)).to.deep.equal(["80002.json: JSON mal formado"]);
  });

  it("errores del esquema con su ruta (la raíz se muestra como /)", () => {
    const e = validarV1(con((d) => delete (d as Partial<Deployment>).startBlock), archivo);
    expect(e[0]).to.match(/^80002\.json: \/ must have required property 'startBlock'/);
    expect(validarV1(con((d) => (d.contracts.CoffeeToken.abiHash = "0x12")), archivo)[0]).to.contain("/contracts/CoffeeToken/abiHash");
  });

  it("chainId distinto del nombre del archivo", () => {
    expect(validarV1(con(() => {}), "137.json")).to.deep.include("137.json: declara chainId 80002");
  });

  it("kind local fuera de 31337 y RPC http fuera de la red local", () => {
    const e = validarV1(con((d) => (d.chain = { ...d.chain, kind: "local", rpcUrl: "http://rpc.ejemplo" })), archivo);
    expect(e.join("\n")).to.contain('chain.kind "local" no corresponde');
    const e2 = validarV1(con((d) => (d.chain = { ...d.chain, rpcUrl: "http://rpc.ejemplo" })), archivo);
    expect(e2).to.deep.equal(["80002.json: chain.rpcUrl debe ser https fuera de la red local"]);
  });

  it("direcciones sin checksum EIP-55 (minúsculas o checksum incorrecto)", () => {
    const minus = validarV1(con((d) => (d.contracts.CoffeeToken.proxy = d.contracts.CoffeeToken.proxy.toLowerCase())), archivo);
    expect(minus).to.deep.equal(["80002.json: contracts.CoffeeToken.proxy no tiene checksum EIP-55"]);
    const mal = validarV1(con((d) => (d.admin = "0xF39fd6e51aad88F6F4ce6aB8827279cffFb92266")), archivo);
    expect(mal).to.deep.equal(["80002.json: admin no tiene checksum EIP-55"]);
  });

  it("abiHash que no es la huella del ABI", () => {
    const e = validarV1(con((d) => (d.contracts.OriginRegistry.abiHash = "0x" + "a".repeat(64))), archivo);
    expect(e).to.deep.equal(["80002.json: contracts.OriginRegistry.abiHash no es la huella de abi.OriginRegistry"]);
  });
});

describe("T02 · comprobar (export:front:check)", () => {
  const ok = (): Parameters<typeof comprobar>[0] & { front: Record<string, string>; origen: Record<string, string> } => ({
    artifacts: abis,
    abisTsActual: generarAbisTs(abis),
    front: { "31337.json": serializar(v1(base31337)), "80002.json": serializar(v1(base80002)) },
    origen: { "80002.json": serializar(v1(base80002)) },
    local31337: v1(base31337, "check"),
  });
  const codigos = (e: ReturnType<typeof ok>) => comprobar(e).map((p) => `${p.nivel}:${p.codigo}`);

  it("HAFront al día: sin problemas", () => {
    expect(comprobar(ok())).to.deep.equal([]);
  });

  it("abis.ts editado a mano o ausente: EXP_ABIS_DESACTUALIZADO", () => {
    expect(codigos({ ...ok(), abisTsActual: generarAbisTs(abis) + "// a mano\n" })).to.deep.equal(["error:EXP_ABIS_DESACTUALIZADO"]);
    expect(codigos({ ...ok(), abisTsActual: null })).to.deep.equal(["error:EXP_ABIS_DESACTUALIZADO"]);
  });

  it("JSON de HAFront inválido: EXP_JSON_INVALIDO", () => {
    const e = ok();
    e.front["137.json"] = "{";
    expect(codigos(e)).to.deep.equal(["error:EXP_JSON_INVALIDO"]);
  });

  it("copia distinta o ausente del original versionado: EXP_COPIA_DISTINTA", () => {
    const e = ok();
    e.origen["80002.json"] = serializar({ ...v1(base80002), deployedAt: "2026-10-20T15:02:11.000Z" });
    expect(codigos(e)).to.deep.equal(["error:EXP_COPIA_DISTINTA"]);
    const f = ok();
    delete f.front["80002.json"];
    expect(codigos(f)).to.deep.equal(["error:EXP_COPIA_DISTINTA"]);
  });

  it("31337 con otras direcciones que un despliegue limpio, o ausente: EXP_31337_DESFASADO", () => {
    const e = ok();
    e.local31337 = v1({ ...base31337, contracts: { ...base31337.contracts, CoffeeToken: { proxy: addr(7), implementation: addr(8) } } });
    expect(codigos(e)).to.deep.equal(["error:EXP_31337_DESFASADO"]);
    const f = ok();
    delete f.front["31337.json"];
    expect(codigos(f)).to.deep.equal(["error:EXP_31337_DESFASADO"]);
  });

  it("sin despliegue limpio (fuera de CI) no compara 31337", () => {
    const e = ok();
    delete e.front["31337.json"];
    expect(comprobar({ ...e, local31337: undefined })).to.deep.equal([]);
  });

  it("otra red con un ABI anterior al código: solo aviso", () => {
    const viejo = v1(base80002);
    viejo.contracts.TraceabilityController.abiHash = abiHash([{ type: "function", name: "viejo" }]);
    viejo.abi = { ...viejo.abi, TraceabilityController: [{ type: "function", name: "viejo" }] };
    const e = ok();
    e.front["80002.json"] = serializar(viejo);
    e.origen["80002.json"] = serializar(viejo);
    expect(codigos(e)).to.deep.equal(["aviso:EXP_ABI_RED_DISTINTO"]);
  });

  it("un archivo ilegible o sin contracts no genera avisos de ABI (ya es un error)", () => {
    const e = ok();
    e.front["137.json"] = "{";
    e.front["138.json"] = JSON.stringify({ chainId: 138, contracts: {} });
    const r = codigos(e);
    expect(r.filter((c) => c.startsWith("aviso"))).to.deep.equal([
      "aviso:EXP_ABI_RED_DISTINTO",
      "aviso:EXP_ABI_RED_DISTINTO",
      "aviso:EXP_ABI_RED_DISTINTO",
    ]);
    const f = ok();
    f.front["139.json"] = JSON.stringify({ chainId: 139 });
    expect(codigos(f).filter((c) => c.startsWith("aviso"))).to.deep.equal([]);
  });
});
