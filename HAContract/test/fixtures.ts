import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { CoffeeToken, OriginRegistry, TraceabilityController } from "../typechain-types";

export const CID = "bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy";
export const H = ethers.id("documento"); // dataHash genérico
export const FINCA = ethers.id("finca-uuid-1");
export const TENANT = ethers.id("APECAEL");
export const GEO = ethers.id("geojson-v1");
export const TYPICA = ethers.encodeBytes32String("Typica");
export const YEAR = 365 * 86400;

export enum Kind {
  NONE,
  LOT,
  DDS_CERT,
}
export enum Form {
  CHERRY,
  PARCHMENT,
  GREEN,
}
export enum State {
  HARVESTED,
  PROCESSED,
  DRIED,
  HULLED,
  GRADED,
  PACKAGED,
  EXPORTED,
}

export const lotId = (seq: number) => (BigInt(Kind.LOT) << 248n) | BigInt(seq);
export const certId = (seq: number) => (BigInt(Kind.DDS_CERT) << 248n) | BigInt(seq);

export async function deployFixture() {
  const [admin, relayer, auditor, farmer, processor, grader, exporter, outsider, productor, beneficio, exportadora] =
    await ethers.getSigners();

  const token = (await upgrades.deployProxy(await ethers.getContractFactory("CoffeeToken"), [admin.address], {
    kind: "uups",
  })) as unknown as CoffeeToken;
  const origin = (await upgrades.deployProxy(
    await ethers.getContractFactory("OriginRegistry"),
    [admin.address, await token.getAddress()],
    { kind: "uups" },
  )) as unknown as OriginRegistry;
  const controller = (await upgrades.deployProxy(
    await ethers.getContractFactory("TraceabilityController"),
    [admin.address, await token.getAddress(), await origin.getAddress()],
    { kind: "uups" },
  )) as unknown as TraceabilityController;

  const CONTROLLER = await token.CONTROLLER_ROLE();
  await token.grantRole(CONTROLLER, await origin.getAddress());
  await token.grantRole(CONTROLLER, await controller.getAddress());

  await origin.grantRole(await origin.RELAYER_ROLE(), relayer.address);
  await origin.grantRole(await origin.AUDITOR_ROLE(), auditor.address);
  await controller.grantRole(await controller.RELAYER_ROLE(), relayer.address);
  await controller.grantRole(await controller.FARMER_ROLE(), farmer.address);
  await controller.grantRole(await controller.PROCESSOR_ROLE(), processor.address);
  await controller.grantRole(await controller.GRADER_ROLE(), grader.address);
  await controller.grantRole(await controller.EXPORTER_ROLE(), exporter.address);

  return {
    token,
    origin,
    controller,
    admin,
    relayer,
    auditor,
    farmer,
    processor,
    grader,
    exporter,
    outsider,
    productor,
    beneficio,
    exportadora,
  };
}

/** Finca registrada, auditada y con DDS vigente (certId 0x02…01). */
export async function compliantFixture() {
  const f = await deployFixture();
  await f.origin.connect(f.relayer).registerFinca(FINCA, TENANT, GEO, 250, CID);
  await f.origin.connect(f.auditor).anchorAudit(FINCA, ethers.id("audit"), true, 1609372800);
  await f.origin.connect(f.auditor).issueDDS(FINCA, f.productor.address, (await time.latest()) + YEAR, CID);
  return f;
}

/** Lote de 500 kg de cereza (lotId 0x01…01) en custodia del productor. */
export async function harvestedFixture() {
  const f = await compliantFixture();
  await f.controller
    .connect(f.farmer)
    .registerHarvest(FINCA, f.productor.address, 500_000, TYPICA, 0, (await time.latest()) - 60, CID);
  return { ...f, cherry: lotId(1) };
}

/** Lote verde de 80 kg (lotId 0x01…03) catado y en custodia de la exportadora. */
export async function gradedFixture() {
  const f = await harvestedFixture();
  const { controller, processor, grader, relayer, productor, beneficio, exportadora } = f;
  await controller.connect(relayer).transferCustody(f.cherry, productor.address, beneficio.address, 500_000, H, "");
  await controller.connect(processor).logProcessing(f.cherry, 0, 36, 45, H, CID);
  await controller.connect(processor).logDrying(f.cherry, beneficio.address, 100_000, 115, 0, H, CID);
  await controller.connect(processor).logHulling(lotId(2), beneficio.address, 80_000, H, CID);
  await controller.connect(grader).addCupping(lotId(3), 86, 3, H, CID);
  await controller.connect(relayer).transferCustody(lotId(3), beneficio.address, exportadora.address, 80_000, H, "");
  return { ...f, parchment: lotId(2), green: lotId(3) };
}
