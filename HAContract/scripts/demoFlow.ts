import { ethers, network } from "hardhat";
import type { ContractTransactionResponse, LogDescription } from "ethers";
import { attach, grantRelayer } from "./lib/contracts";
import { documentHash } from "./lib/documents";
import { gatewayUrl, pinDocument, pinFile, type Pinned } from "./lib/ipfs";

// Flujo completo de la Fase 2 del plan sobre un despliegue existente, en modo relayer
// (PLAN §3.6): una sola cuenta firma y los custodios son direcciones custodiales.
//   finca → auditoría → DDS → cosecha → custodia → beneficio → secado → trilla → cata
//   → custodia → split en sacos → merge → exportación, y luego el linaje hasta la finca.
// Opcional: DEMO_PHOTO=ruta/foto.jpg para adjuntar una foto real del lote.

const LOCAL = network.name === "hardhat" || network.name === "localhost";
const FORMS = ["CHERRY", "PARCHMENT", "GREEN"] as const;
const STATES = ["HARVESTED", "PROCESSED", "DRIED", "HULLED", "GRADED", "PACKAGED", "EXPORTED"] as const;
const hex = (id: bigint) => "0x" + id.toString(16).padStart(64, "0");
const day = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);

function show(label: string, p: Pinned) {
  console.log(`    ${label}: ${p.uri}${p.pinned ? `  ·  ${gatewayUrl(p.cid)}` : "  (sin fijar: falta PINATA_JWT)"}`);
}

async function send(label: string, tx: Promise<ContractTransactionResponse>) {
  const sent = await tx;
  const rc = await sent.wait();
  console.log(`  ✓ ${label} · tx ${sent.hash}`);
  return rc!;
}

async function main() {
  const { token, origin, controller, chainId } = await attach();
  const [relayer] = await ethers.getSigners();
  const parse = (logs: readonly { topics: readonly string[]; data: string }[], name: string): LogDescription =>
    logs.map((l) => controller.interface.parseLog(l)).find((l) => l?.name === name)!;

  console.log(`Red ${network.name} (chainId ${chainId}) · relayer ${relayer.address}`);
  await grantRelayer(origin, controller, relayer.address);

  // Direcciones custodiales (el sistema las genera; no necesitan POL ni firmar).
  const productor = ethers.Wallet.createRandom().address;
  const beneficio = ethers.Wallet.createRandom().address;
  const exportador = ethers.Wallet.createRandom().address;
  console.log(`Custodios: productor ${productor} · beneficio ${beneficio} · exportador ${exportador}`);

  const now = Math.floor(Date.now() / 1000);
  const tenant = "DEMO";
  const fincaId = ethers.id(`finca-demo-${now}`);

  // 1. Finca (versión 1): el polígono se ancla por hash; aquí se publica porque es una demo con consentimiento.
  console.log("1. Finca");
  const geojson = {
    type: "Polygon",
    coordinates: [[[-79.21, -3.99], [-79.2, -3.99], [-79.2, -4.0], [-79.21, -4.0], [-79.21, -3.99]]],
  };
  const geoHash = documentHash(geojson);
  const fincaDoc = await pinDocument(
    "finca/v1",
    `finca-${now}`,
    { fincaId, version: 1, tenant, provincia: "Loja", canton: "Loja", areaTotalHa: 2.5, geoHash, geojson, schema: "huella-altura/finca/v1" },
    LOCAL,
  );
  show("finca", fincaDoc);
  await send("registerFinca", origin.registerFinca(fincaId, ethers.id(tenant), geoHash, 250, fincaDoc.cid));

  // 2. Auditoría GEE aprobada (el informe queda en Postgres; on-chain solo su hash).
  console.log("2. Auditoría de deforestación");
  const fechaCorte = Math.floor(Date.UTC(2020, 11, 31) / 1000);
  const auditHash = documentHash({ fincaId, resultado: "APROBADO", fuente: "GEE", fechaCorte: day(fechaCorte) });
  await send("anchorAudit", origin.anchorAudit(fincaId, auditHash, true, fechaCorte));

  // 3. Certificado DDS.
  console.log("3. Certificado DDS");
  const expires = now + 365 * 86400;
  const ddsDoc = await pinDocument(
    "dds/v1",
    `dds-${now}`,
    {
      name: "Certificado DDS · finca demo",
      description: "Declaración de diligencia debida EUDR",
      properties: {
        kind: "DDS_CERT",
        codigoCertificado: `DDS-DEMO-${now}`,
        tenant,
        fincaId,
        fincaVersion: 1,
        emitidoEn: day(now),
        venceEn: day(expires),
        auditHash,
        fechaCorte: day(fechaCorte),
        schema: "huella-altura/dds/v1",
      },
    },
    LOCAL,
  );
  show("dds", ddsDoc);
  const ddsRc = await send("issueDDS", origin.issueDDS(fincaId, productor, expires, ddsDoc.cid));
  const certId = ddsRc.logs
    .map((l) => origin.interface.parseLog(l))
    .find((l) => l?.name === "DDSIssued")!.args.certId as bigint;
  console.log(`    certId ${hex(certId)} · isCompliant = ${await origin.isCompliant(fincaId)}`);

  // Documento de lote (lot/v1) para cada fase; cada versión apunta a la anterior.
  const harvestDate = now - 3600;
  let photo: string | undefined;
  if (process.env.DEMO_PHOTO) {
    const p = await pinFile(process.env.DEMO_PHOTO, LOCAL);
    show("foto", p);
    photo = p.uri;
  }
  let previous: string | undefined;
  const lotDoc = async (
    label: string,
    state: number,
    form: number,
    grams: number,
    parents: bigint[],
    phase: Record<string, string | number>,
  ) => {
    const doc = {
      name: `Lote demo · ${FORMS[form]} · ${STATES[state]}`,
      description: "Café de altura con trazabilidad en Polygon",
      ...(photo ? { image: photo } : {}),
      properties: {
        kind: "LOT",
        form: FORMS[form],
        state: STATES[state],
        tenant,
        origin: { fincaId, fincaVersion: 1, ddsCertId: hex(certId), provincia: "Loja" },
        variety: "Typica",
        harvestDate: day(harvestDate),
        grams,
        phase,
        parents: parents.map(hex),
        ...(previous ? { previousCID: previous } : {}),
        schema: "huella-altura/lot/v1",
      },
    };
    const p = await pinDocument("lot/v1", `lote-${label}-${now}`, doc, LOCAL);
    show(label, p);
    previous = p.uri;
    return p;
  };
  const remision = (from: string, to: string, grams: number) =>
    documentHash({ guia: `GR-${now}-${from.slice(2, 6)}`, de: from, para: to, gramos: grams });

  // 4. Cosecha: 500 kg de cereza.
  console.log("4. Cosecha");
  let doc = await lotDoc("cosecha", 0, 0, 500_000, [], { madurez: "RIPE" });
  let rc = await send(
    "registerHarvest",
    controller.registerHarvest(fincaId, productor, 500_000, ethers.encodeBytes32String("Typica"), 0, harvestDate, doc.cid),
  );
  const cherryId = parse(rc.logs, "HarvestRegistered").args.lotId as bigint;
  console.log(`    lote cereza ${hex(cherryId)}`);

  console.log("5. Custodia productor → beneficio");
  await send(
    "transferCustody",
    controller.transferCustody(cherryId, productor, beneficio, 500_000, remision(productor, beneficio, 500_000), ""),
  );

  console.log("6. Beneficio húmedo");
  doc = await lotDoc("beneficio", 1, 0, 500_000, [], { proceso: "WASHED", fermentacionHoras: 36, ph: 4.5 });
  await send("logProcessing", controller.logProcessing(cherryId, 0, 36, 45, doc.hash, doc.cid));

  console.log("7. Secado (500 kg cereza → 100 kg pergamino, humedad 11,5 %)");
  doc = await lotDoc("secado", 2, 1, 100_000, [cherryId], { metodo: "PATIO", humedad: 11.5 });
  rc = await send("logDrying", controller.logDrying(cherryId, beneficio, 100_000, 115, 0, doc.hash, doc.cid));
  const parchmentId = parse(rc.logs, "LotTransformed").args.toLotId as bigint;

  console.log("8. Trilla (100 kg pergamino → 80 kg verde)");
  doc = await lotDoc("trilla", 3, 2, 80_000, [parchmentId], { factorRendimiento: 0.8 });
  rc = await send("logHulling", controller.logHulling(parchmentId, beneficio, 80_000, doc.hash, doc.cid));
  const greenId = parse(rc.logs, "LotTransformed").args.toLotId as bigint;

  console.log("9. Cata SCA");
  doc = await lotDoc("cata", 4, 2, 80_000, [parchmentId], { scaScore: 86.5, defectos: 3 });
  await send("addCupping", controller.addCupping(greenId, 86, 3, doc.hash, doc.cid));

  console.log("10. Custodia beneficio → exportador");
  await send(
    "transferCustody",
    controller.transferCustody(greenId, beneficio, exportador, 80_000, remision(beneficio, exportador, 80_000), ""),
  );

  console.log("11. Empaque en 2 sacos de 40 kg");
  doc = await lotDoc("sacos", 5, 2, 80_000, [greenId], { sacos: 2, pesoSacoKg: 40 });
  rc = await send("split", controller.split(greenId, exportador, [40_000, 40_000], doc.cid));
  const sacks = parse(rc.logs, "LotSplit").args.childIds as bigint[];

  console.log("12. Lote de exportación (merge)");
  doc = await lotDoc("exportacion", 5, 2, 80_000, [...sacks], { contenedor: "DEMO-CONT-01" });
  rc = await send("merge", controller.merge([...sacks], exportador, doc.cid));
  const exportId = parse(rc.logs, "LotMerged").args.lotId as bigint;

  console.log("13. Exportación");
  doc = await lotDoc("exportado", 6, 2, 80_000, [...sacks], { destino: "Hamburgo", referenciaDDS: `TRACES-DEMO-${now}` });
  await send(
    "markExported",
    controller.markExported(exportId, ethers.id(`TRACES-DEMO-${now}`), doc.hash, doc.cid),
  );

  // Linaje: del lote exportado hasta la finca y su DDS.
  console.log(`\nLinaje del lote exportado ${hex(exportId)}:`);
  const walk = async (id: bigint, depth: number): Promise<void> => {
    const lot = await controller.getLot(id);
    const grams = await token["totalSupply(uint256)"](id);
    console.log(
      `${"  ".repeat(depth + 1)}${hex(id)} · ${FORMS[Number(lot.form)]} · ${STATES[Number(lot.state)]} · ${grams} g en circulación`,
    );
    const parents = await controller.lineage(id);
    if (parents.length === 0) {
      console.log(
        `${"  ".repeat(depth + 2)}↳ finca ${lot.fincaId} v${lot.fincaVersion} · DDS ${hex(lot.ddsCertId)} · URI ${await token.uri(lot.ddsCertId)}`,
      );
    }
    for (const p of parents) await walk(p, depth + 1);
  };
  await walk(exportId, 0);
  console.log(`\nURI del lote exportado: ${await token.uri(exportId)}`);
  if (chainId === 80002n) {
    console.log(`Eventos: https://amoy.polygonscan.com/address/${await controller.getAddress()}#events`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
