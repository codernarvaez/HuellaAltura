import { expect } from "chai";
import { ethers } from "hardhat";
import { canonicalJSON, documentHash, validateDocument } from "../scripts/lib/documents";
import { computeRawCid, pinDocument } from "../scripts/lib/ipfs";

const fincaId = ethers.id("finca");
const lot = {
  name: "Lote HA-2026-000123 · Café verde",
  description: "Café de altura",
  properties: {
    kind: "LOT",
    form: "GREEN",
    state: "GRADED",
    tenant: "APECAEL",
    origin: { fincaId, fincaVersion: 2, ddsCertId: "0x0200000000000000000000000000000000000000000000000000000000000007" },
    variety: "Typica",
    harvestDate: "2026-06-14",
    phase: { scaScore: 86.5, defects: 3 },
    parents: ["0x01"],
    schema: "huella-altura/lot/v1",
  },
};

describe("documentos off-chain", () => {
  it("serializa en forma canónica: mismo contenido, mismo hash", () => {
    const a = { b: 1, a: { d: [3, { y: 1, x: 2 }], c: "é" } };
    const b = { a: { c: "é", d: [3, { x: 2, y: 1 }] }, b: 1 };
    expect(canonicalJSON(a)).to.equal('{"a":{"c":"é","d":[3,{"x":2,"y":1}]},"b":1}');
    expect(documentHash(a)).to.equal(documentHash(b));
  });

  it("valida los esquemas lot/v1, dds/v1 y finca/v1", () => {
    expect(() => validateDocument("lot/v1", lot)).to.not.throw();
    expect(() =>
      validateDocument("dds/v1", {
        name: "DDS",
        description: "x",
        properties: {
          kind: "DDS_CERT",
          codigoCertificado: "DDS-1",
          fincaId,
          fincaVersion: 1,
          emitidoEn: "2026-01-01",
          venceEn: "2027-01-01",
          auditHash: fincaId,
          schema: "huella-altura/dds/v1",
        },
      }),
    ).to.not.throw();
    expect(() =>
      validateDocument("finca/v1", {
        fincaId,
        version: 1,
        tenant: "APECAEL",
        areaTotalHa: 2.5,
        geoHash: fincaId,
        schema: "huella-altura/finca/v1",
      }),
    ).to.not.throw();
    expect(() =>
      validateDocument("lot/v1", { ...lot, properties: { ...lot.properties, state: "TOSTADO" } }),
    ).to.throw(/inválido/);
  });

  it("rechaza datos personales en cualquier nivel", () => {
    const bad = { ...lot, properties: { ...lot.properties, phase: { cedula: "1100000000" } } };
    expect(() => validateDocument("lot/v1", bad)).to.throw(/personal.*cedula/);
    expect(() => validateDocument("finca/v1", { list: [{ Telefono: "1" }] })).to.throw(/personal/);
  });

  it("calcula el CIDv1 raw estándar", () => {
    // `ipfs add --cid-version 1` de la cadena "hello world".
    expect(computeRawCid(Buffer.from("hello world"))).to.equal(
      "bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e",
    );
  });

  it("sin PINATA_JWT solo calcula el CID en redes locales", async () => {
    const saved = process.env.PINATA_JWT;
    delete process.env.PINATA_JWT;
    try {
      const local = await pinDocument("lot/v1", "x", lot, true);
      expect(local.pinned).to.equal(false);
      expect(local.uri).to.equal(`ipfs://${local.cid}`);
      expect(local.hash).to.equal(documentHash(lot));
      expect(local.cid).to.equal(computeRawCid(Buffer.from(canonicalJSON(lot))));
      await expect(pinDocument("lot/v1", "x", lot)).to.be.rejectedWith(/PINATA_JWT/);
    } finally {
      if (saved !== undefined) process.env.PINATA_JWT = saved;
    }
  });
});
