import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_TRAZABILIDAD,
  FASES_LOTE,
  VISTAS,
  esFaseLote,
  esLoteIdValido,
  migasDePan,
  obtenerVista,
  rutaVista,
  vistaDesdeRuta,
} from "../src/lib/trazabilidad/rutas.ts";
import { respuestaNoEncontrado } from "../src/lib/trazabilidad/noEncontrado.ts";

const MAX_UINT256 = ((1n << 256n) - 1n).toString();
const UINT256_MAS_UNO = (1n << 256n).toString();

describe("catálogo VISTAS", () => {
  it("tiene V1 a V8 con ids únicos y una tarea cada una", () => {
    assert.deepEqual(VISTAS.map((v) => v.id), ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8"]);
    for (const v of VISTAS) assert.match(v.tarea, /^T\d{2}$/, v.id);
  });

  it("obtenerVista falla con un id desconocido", () => {
    // @ts-expect-error id fuera del tipo IdVista
    assert.throws(() => obtenerVista("V9"), /Vista desconocida/);
  });
});

describe("esLoteIdValido", () => {
  it("acepta enteros positivos hasta 2^256 - 1", () => {
    for (const id of ["1", "42", MAX_UINT256]) assert.equal(esLoteIdValido(id), true, id);
  });

  it("rechaza ceros, ceros a la izquierda, formatos ajenos y valores sobre uint256", () => {
    for (const id of ["0", "007", "-1", "1.5", "abc", "0x2a", "", "9".repeat(78), "1".repeat(79), UINT256_MAS_UNO]) {
      assert.equal(esLoteIdValido(id), false, id);
    }
    assert.equal(esLoteIdValido(undefined), false);
  });
});

describe("esFaseLote", () => {
  it("acepta solo las cuatro fases", () => {
    for (const f of FASES_LOTE) assert.equal(esFaseLote(f), true, f);
    for (const f of ["Secado", "empaque", "cosecha", "", undefined]) assert.equal(esFaseLote(f), false, String(f));
  });
});

describe("rutaVista", () => {
  it("arma las rutas de módulo sin id", () => {
    assert.equal(rutaVista("V1"), BASE_TRAZABILIDAD);
    assert.equal(rutaVista("V2"), "/trazabilidad/cosecha");
    assert.equal(rutaVista("V8"), "/trazabilidad/empaque");
  });

  it("arma las rutas de lote con un id válido", () => {
    assert.equal(rutaVista("V3", "42"), "/trazabilidad/lotes/42");
    assert.equal(rutaVista("V5", "42"), "/trazabilidad/lotes/42/secado");
  });

  it("falla si una vista de lote no recibe un id válido", () => {
    assert.throws(() => rutaVista("V3"), /id de lote válido/);
    assert.throws(() => rutaVista("V4", "abc"), /id de lote válido/);
  });
});

describe("vistaDesdeRuta", () => {
  const id = (ruta: string) => vistaDesdeRuta(ruta)?.vista.id ?? null;

  it("reconoce cada vista, con y sin barra final", () => {
    assert.equal(id("/trazabilidad"), "V1");
    assert.equal(id("/trazabilidad/"), "V1");
    assert.equal(id("/trazabilidad/cosecha"), "V2");
    assert.equal(id("/trazabilidad/empaque"), "V8");
    assert.equal(id("/trazabilidad/lotes/1"), "V3");
    assert.equal(id("/trazabilidad/lotes/1/"), "V3");
    assert.equal(id("/trazabilidad/lotes/1/beneficio"), "V4");
    assert.equal(id("/trazabilidad/lotes/1/secado"), "V5");
    assert.equal(id("/trazabilidad/lotes/1/trilla"), "V6");
    assert.equal(id("/trazabilidad/lotes/1/cata"), "V7");
    assert.equal(vistaDesdeRuta("/trazabilidad/lotes/42/cata")?.loteId, "42");
  });

  it("devuelve null fuera del módulo o con segmentos inválidos", () => {
    for (const ruta of [
      "/",
      "/trazabilidadX",
      "/trazabilidad/lotes",
      "/trazabilidad/otra",
      "/trazabilidad/cosecha/1",
      "/trazabilidad/lotes/0",
      "/trazabilidad/lotes/abc/secado",
      "/trazabilidad/lotes/1/empaque",
      "/trazabilidad/lotes/1/secado/extra",
    ]) {
      assert.equal(vistaDesdeRuta(ruta), null, ruta);
    }
  });
});

describe("migasDePan", () => {
  it("marca como página actual el último elemento", () => {
    assert.deepEqual(migasDePan("/trazabilidad"), [
      { etiqueta: "Trazabilidad", href: "/trazabilidad" },
      { etiqueta: "Panel de lotes" },
    ]);
    assert.deepEqual(migasDePan("/trazabilidad/cosecha"), [
      { etiqueta: "Trazabilidad", href: "/trazabilidad" },
      { etiqueta: "Registrar cosecha" },
    ]);
    assert.deepEqual(migasDePan("/trazabilidad/lotes/42"), [
      { etiqueta: "Trazabilidad", href: "/trazabilidad" },
      { etiqueta: "Lote 42" },
    ]);
    assert.deepEqual(migasDePan("/trazabilidad/lotes/42/secado"), [
      { etiqueta: "Trazabilidad", href: "/trazabilidad" },
      { etiqueta: "Lote 42", href: "/trazabilidad/lotes/42" },
      { etiqueta: "Secado" },
    ]);
  });

  it("devuelve una lista vacía fuera del módulo", () => {
    assert.deepEqual(migasDePan("/productorFinca"), []);
  });
});

describe("respuestaNoEncontrado", () => {
  it("responde 404 en HTML con enlace al panel", async () => {
    const res = respuestaNoEncontrado();
    assert.equal(res.status, 404);
    assert.match(res.headers.get("Content-Type") ?? "", /text\/html/);
    assert.match(await res.text(), /href="\/trazabilidad"/);
  });
});
