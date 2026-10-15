import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { originAbi, traceabilityAbi } from "../src/lib/chain/abis.ts";
import { ESTADOS, FORMAS, MADUREZ } from "../src/lib/chain/documentos.ts";
import { obtenerVista } from "../src/lib/trazabilidad/rutas.ts";
import {
  DESTINOS,
  ESTADOS_LOTE,
  ETAPAS,
  ETAPAS_LINEALES,
  FASES_SGTC,
  avanceDelLote,
  camposPorDestino,
  camposPropuestos,
  etapaPorEstado,
  obtenerEtapa,
  resumenDestinos,
} from "../src/lib/trazabilidad/pipeline.ts";

type EntradaAbi = { type: string; name?: string; inputs?: readonly { name: string }[] };

function abiDe(contrato: "OriginRegistry" | "TraceabilityController"): readonly EntradaAbi[] {
  return (contrato === "OriginRegistry" ? originAbi : traceabilityAbi) as readonly EntradaAbi[];
}

describe("pipeline frente al contrato", () => {
  it("los estados y formas coinciden con CoffeeTypes.sol y con lot/v1", () => {
    assert.deepEqual([...ESTADOS_LOTE], [...ESTADOS]);
    for (const e of ETAPAS) if (e.forma) assert.ok((FORMAS as readonly string[]).includes(e.forma), e.id);
  });

  it("cada función y evento de cada etapa existe en el ABI de su contrato", () => {
    for (const etapa of ETAPAS) {
      const abi = abiDe(etapa.contrato);
      for (const f of etapa.funciones) assert.ok(abi.some((x) => x.type === "function" && x.name === f), `${etapa.id}: ${f}`);
      for (const ev of etapa.eventos) assert.ok(abi.some((x) => x.type === "event" && x.name === ev), `${etapa.id}: ${ev}`);
    }
  });

  it("todo campo on-chain vigente es un parámetro de una función de su etapa", () => {
    for (const etapa of ETAPAS) {
      const abi = abiDe(etapa.contrato);
      const parametros = new Set(
        abi
          .filter((x) => x.type === "function" && etapa.funciones.includes(x.name!))
          .flatMap((x) => (x.inputs ?? []).map((i) => i.name)),
      );
      for (const c of etapa.campos) {
        if (c.estado !== "vigente" || (c.destino !== "storage" && c.destino !== "evento")) continue;
        assert.ok(parametros.has(c.clave), `${etapa.id}.${c.clave} no es parámetro de ${etapa.funciones.join("/")}`);
      }
    }
  });

  it("ningún campo propuesto exige cambiar el contrato: todos van a IPFS o se quedan privados", () => {
    const propuestos = camposPropuestos();
    assert.ok(propuestos.length > 0);
    for (const { etapa, campo } of propuestos) {
      assert.ok(campo.destino === "ipfs" || campo.destino === "privado", `${etapa}.${campo.clave}`);
      assert.ok(campo.sgtc || campo.nota, `${etapa}.${campo.clave} sin origen ni nota`);
    }
  });

  it("las opciones de madurez siguen el orden del enum Ripeness", () => {
    const madurez = obtenerEtapa("cosecha").campos.find((c) => c.clave === "ripeness")!;
    assert.deepEqual(madurez.opciones!.map((o) => o.valor), [...MADUREZ]);
  });
});

describe("catálogo de etapas", () => {
  it("ids únicos y claves únicas dentro de cada etapa", () => {
    assert.equal(new Set(ETAPAS.map((e) => e.id)).size, ETAPAS.length);
    for (const e of ETAPAS) assert.equal(new Set(e.campos.map((c) => c.clave)).size, e.campos.length, e.id);
  });

  it("las etapas lineales recorren todos los estados en orden y cada una exige el anterior", () => {
    const conEstado = ETAPAS_LINEALES.filter((e) => e.estado);
    assert.deepEqual(conEstado.map((e) => e.estado), [...ESTADOS_LOTE]);
    for (let i = 1; i < conEstado.length; i++) {
      assert.ok(conEstado[i]!.requiere!.includes(conEstado[i - 1]!.estado!), conEstado[i]!.id);
    }
    assert.equal(ETAPAS_LINEALES[0]!.id, "origen");
  });

  it("las vistas citadas existen en el catálogo de rutas", () => {
    for (const e of ETAPAS) if (e.vista) assert.equal(obtenerVista(e.vista).id, e.vista);
  });

  it("ningún campo publicable tiene una clave personal", () => {
    const personal = /^(nombres?|apellidos?|cedula|identificacion|ruc|telefono|celular|email|correo|direccion|firma|escritura)$/i;
    for (const e of ETAPAS) {
      for (const c of e.campos) if (c.destino !== "privado") assert.ok(!personal.test(c.clave), `${e.id}.${c.clave}`);
    }
  });

  it("la custodia es la única etapa transversal y no mueve el estado", () => {
    const transversales = ETAPAS.filter((e) => e.transversal);
    assert.deepEqual(transversales.map((e) => e.id), ["custodia"]);
    assert.equal(transversales[0]!.estado, null);
  });

  it("obtenerEtapa falla con un id desconocido", () => {
    // @ts-expect-error id fuera del tipo IdEtapa
    assert.throws(() => obtenerEtapa("tostado"), /Etapa desconocida/);
  });

  it("cada fase de SGTC apunta a una etapa existente o se declara fuera de alcance", () => {
    assert.deepEqual(
      FASES_SGTC.map((f) => f.fase),
      ["Sembrado", "Cosecha", "Despulpado", "Secado", "Tostado", "Molido", "Empaquetado", "Transporte"],
    );
    for (const f of FASES_SGTC) if (f.etapa) obtenerEtapa(f.etapa);
    assert.deepEqual(FASES_SGTC.filter((f) => !f.etapa).map((f) => f.fase), ["Tostado", "Molido"]);
  });
});

describe("etapaPorEstado y avanceDelLote", () => {
  it("acepta el nombre o el índice del enum", () => {
    assert.equal(etapaPorEstado("DRIED")!.id, "secado");
    assert.equal(etapaPorEstado(2)!.id, "secado");
    assert.equal(etapaPorEstado(0)!.id, "cosecha");
    assert.equal(etapaPorEstado(6)!.id, "exportacion");
    assert.equal(etapaPorEstado(7), null);
    assert.equal(etapaPorEstado(-1), null);
  });

  it("sin lote, el origen es la etapa actual y el resto está pendiente", () => {
    const a = avanceDelLote(null);
    assert.equal(a.length, ETAPAS_LINEALES.length);
    assert.deepEqual(a.map((x) => x.avance), ["actual", ...Array(ETAPAS_LINEALES.length - 1).fill("pendiente")]);
  });

  it("un lote secado tiene hechas origen, cosecha y beneficio", () => {
    const a = avanceDelLote("DRIED");
    const hechas = a.filter((x) => x.avance === "hecha").map((x) => x.etapa.id);
    assert.deepEqual(hechas, ["origen", "cosecha", "beneficio"]);
    assert.equal(a.find((x) => x.avance === "actual")!.etapa.id, "secado");
  });

  it("un lote exportado tiene todo hecho salvo la exportación, que es la actual", () => {
    const a = avanceDelLote(6);
    assert.equal(a.filter((x) => x.avance === "pendiente").length, 0);
    assert.equal(a.at(-1)!.avance, "actual");
  });

  it("falla con un estado desconocido", () => {
    assert.throws(() => avanceDelLote(9), /Estado de lote desconocido/);
  });
});

describe("agrupación por destino", () => {
  it("camposPorDestino respeta el orden de DESTINOS y omite grupos vacíos", () => {
    const grupos = camposPorDestino(obtenerEtapa("cata"));
    assert.deepEqual(grupos.map((g) => g.destino), ["evento", "ipfs"]);
    const total = grupos.reduce((n, g) => n + g.campos.length, 0);
    assert.equal(total, obtenerEtapa("cata").campos.length);
  });

  it("resumenDestinos cuenta todos los campos y solo los vigentes", () => {
    const todos = resumenDestinos();
    const vigentes = resumenDestinos(true);
    const total = ETAPAS.reduce((n, e) => n + e.campos.length, 0);
    assert.equal(DESTINOS.reduce((n, d) => n + todos[d], 0), total);
    assert.equal(
      DESTINOS.reduce((n, d) => n + todos[d] - vigentes[d], 0),
      camposPropuestos().length,
    );
  });
});
