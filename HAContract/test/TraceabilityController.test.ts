import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import {
  CID,
  FINCA,
  Form,
  GEO,
  H,
  State,
  TENANT,
  TYPICA,
  YEAR,
  certId,
  compliantFixture,
  deployFixture,
  gradedFixture,
  harvestedFixture,
  lotId,
} from "./fixtures";

describe("TraceabilityController", () => {
  describe("cosecha (puerta EUDR)", () => {
    it("acuña el lote en gramos con su origen, versión y DDS", async () => {
      const { controller, token, farmer, productor } = await loadFixture(compliantFixture);
      const now = await time.latest();
      await expect(controller.connect(farmer).registerHarvest(FINCA, productor.address, 500_000, TYPICA, 1, now, CID))
        .to.emit(controller, "HarvestRegistered")
        .withArgs(lotId(1), FINCA, productor.address, 500_000, TYPICA, 1, certId(1), CID);

      const lot = await controller.getLot(lotId(1));
      expect(lot.fincaId).to.equal(FINCA);
      expect(lot.tenantId).to.equal(TENANT);
      expect(lot.fincaVersion).to.equal(1);
      expect(lot.ddsCertId).to.equal(certId(1));
      expect(lot.form).to.equal(Form.CHERRY);
      expect(lot.state).to.equal(State.HARVESTED);
      expect(await token.balanceOf(productor.address, lotId(1))).to.equal(500_000n);
      expect(await token.uri(lotId(1))).to.equal(`ipfs://${CID}`);
      expect(await controller.lineage(lotId(1))).to.deep.equal([]);
    });

    it("usa la hora del bloque si no se indica fecha de cosecha", async () => {
      const { controller, farmer, productor } = await loadFixture(compliantFixture);
      await controller.connect(farmer).registerHarvest(FINCA, productor.address, 1, TYPICA, 0, 0, CID);
      expect((await controller.getLot(lotId(1))).harvestDate).to.equal(await time.latest());
    });

    it("rechaza fincas sin DDS vigente, revocado o vencido", async () => {
      const { controller, origin, farmer, auditor, productor } = await loadFixture(compliantFixture);
      await expect(
        controller.connect(farmer).registerHarvest(ethers.id("x"), productor.address, 1, TYPICA, 0, 0, CID),
      ).to.be.revertedWithCustomError(controller, "FincaNotCompliant");
      await origin.connect(auditor).revokeDDS(certId(1), "x");
      await expect(
        controller.connect(farmer).registerHarvest(FINCA, productor.address, 1, TYPICA, 0, 0, CID),
      ).to.be.revertedWithCustomError(controller, "FincaNotCompliant");
    });

    it("valida rol, custodio, masa y fecha", async () => {
      const { controller, farmer, outsider, productor } = await loadFixture(compliantFixture);
      await expect(
        controller.connect(outsider).registerHarvest(FINCA, productor.address, 1, TYPICA, 0, 0, CID),
      ).to.be.revertedWithCustomError(controller, "AccessControlUnauthorizedAccount");
      await expect(
        controller.connect(farmer).registerHarvest(FINCA, ethers.ZeroAddress, 1, TYPICA, 0, 0, CID),
      ).to.be.revertedWithCustomError(controller, "ZeroAddress");
      await expect(
        controller.connect(farmer).registerHarvest(FINCA, productor.address, 0, TYPICA, 0, 0, CID),
      ).to.be.revertedWithCustomError(controller, "InvalidMass");
      await expect(
        controller.connect(farmer).registerHarvest(FINCA, productor.address, 1, TYPICA, 0, (await time.latest()) + 999, CID),
      ).to.be.revertedWithCustomError(controller, "InvalidHarvestDate");
    });

    it("un lote ya acuñado conserva su DDS aunque luego se revoque", async () => {
      const { controller, origin, auditor, cherry } = await loadFixture(harvestedFixture);
      await origin.connect(auditor).revokeDDS(certId(1), "x");
      expect((await controller.getLot(cherry)).ddsCertId).to.equal(certId(1));
    });
  });

  describe("fases y transformaciones", () => {
    it("recorre cosecha → exportación conservando la masa y el linaje", async () => {
      const f = await loadFixture(harvestedFixture);
      const { controller, token, processor, grader, exporter, relayer, productor, beneficio, exportadora } = f;

      await expect(
        controller.connect(relayer).transferCustody(f.cherry, productor.address, beneficio.address, 500_000, H, CID),
      )
        .to.emit(controller, "CustodyTransferred")
        .withArgs(f.cherry, productor.address, beneficio.address, 500_000, H, CID);

      await expect(controller.connect(processor).logProcessing(f.cherry, 0, 36, 45, H, "cid-proc"))
        .to.emit(controller, "LotStateChanged")
        .withArgs(f.cherry, State.HARVESTED, State.PROCESSED, processor.address)
        .and.to.emit(controller, "LotProcessed")
        .withArgs(f.cherry, 0, 36, 45, H, "cid-proc");
      expect(await token.uri(f.cherry)).to.equal("ipfs://cid-proc");

      await expect(controller.connect(processor).logDrying(f.cherry, beneficio.address, 100_000, 115, 0, H, CID))
        .to.emit(controller, "LotTransformed")
        .withArgs(f.cherry, lotId(2), beneficio.address, Form.PARCHMENT, 500_000, 100_000, H, CID)
        .and.not.to.emit(controller, "HighMoistureWarning");
      expect(await token.balanceOf(beneficio.address, f.cherry)).to.equal(0n);
      expect(await token.balanceOf(beneficio.address, lotId(2))).to.equal(100_000n);
      expect((await controller.getLot(lotId(2))).state).to.equal(State.DRIED);
      expect(await controller.lineage(lotId(2))).to.deep.equal([f.cherry]);

      await controller.connect(processor).logHulling(lotId(2), beneficio.address, 80_000, H, CID);
      const green = lotId(3);
      expect((await controller.getLot(green)).form).to.equal(Form.GREEN);
      expect((await controller.getLot(green)).state).to.equal(State.HULLED);

      await expect(controller.connect(grader).addCupping(green, 86, 3, H, CID))
        .to.emit(controller, "LotGraded")
        .withArgs(green, grader.address, 86, 3, H, CID);

      await controller.connect(relayer).transferCustody(green, beneficio.address, exportadora.address, 80_000, H, "");

      await expect(controller.connect(exporter).split(green, exportadora.address, [50_000, 30_000], CID))
        .to.emit(controller, "LotSplit")
        .withArgs(green, exportadora.address, [lotId(4), lotId(5)], [50_000, 30_000], CID);
      expect(await token["totalSupply(uint256)"](green)).to.equal(0n);
      expect(await token.balanceOf(exportadora.address, lotId(4))).to.equal(50_000n);
      expect((await controller.getLot(lotId(5))).state).to.equal(State.PACKAGED);
      expect(await controller.lineage(lotId(5))).to.deep.equal([green]);

      await expect(controller.connect(exporter).merge([lotId(4), lotId(5)], exportadora.address, CID))
        .to.emit(controller, "LotMerged")
        .withArgs(lotId(6), exportadora.address, [lotId(4), lotId(5)], 80_000, CID);
      const exportLot = lotId(6);
      expect(await token.balanceOf(exportadora.address, exportLot)).to.equal(80_000n);
      expect(await controller.lineage(exportLot)).to.deep.equal([lotId(4), lotId(5)]);
      const merged = await controller.getLot(exportLot);
      expect(merged.fincaId).to.equal(FINCA);
      expect(merged.variety).to.equal(TYPICA);

      const ref = ethers.id("TRACES-1");
      await expect(controller.connect(exporter).markExported(exportLot, ref, H, CID))
        .to.emit(controller, "LotExported")
        .withArgs(exportLot, ref, H, CID);
      expect((await controller.getLot(exportLot)).state).to.equal(State.EXPORTED);

      // El linaje lleva del lote exportado hasta la cereza original.
      let id = exportLot;
      const path: bigint[] = [id];
      for (;;) {
        const parents = await controller.lineage(id);
        if (parents.length === 0) break;
        id = parents[0];
        path.push(id);
      }
      expect(path).to.deep.equal([exportLot, lotId(4), green, lotId(2), f.cherry]);
      expect((await controller.getLot(f.cherry)).ddsCertId).to.equal(certId(1));
    });

    it("emite HighMoistureWarning por encima de 12,5 % sin bloquear", async () => {
      const { controller, processor, productor, cherry } = await loadFixture(harvestedFixture);
      await controller.connect(processor).logProcessing(cherry, 1, 0, 50, H, CID);
      await expect(controller.connect(processor).logDrying(cherry, productor.address, 100_000, 130, 2, H, CID))
        .to.emit(controller, "HighMoistureWarning")
        .withArgs(lotId(2), 130)
        .and.to.emit(controller, "LotDried")
        .withArgs(lotId(2), 130, 2);
    });

    it("con custodia repartida, cada custodio transforma su parte", async () => {
      const { controller, token, processor, relayer, productor, beneficio, cherry } = await loadFixture(harvestedFixture);
      await controller.connect(relayer).transferCustody(cherry, productor.address, beneficio.address, 200_000, H, "");
      await controller.connect(processor).logProcessing(cherry, 0, 36, 45, H, CID);
      await controller.connect(processor).logDrying(cherry, beneficio.address, 40_000, 110, 0, H, CID);
      await controller.connect(processor).logDrying(cherry, productor.address, 60_000, 110, 0, H, CID);
      expect(await token["totalSupply(uint256)"](cherry)).to.equal(0n);
      expect(await token.balanceOf(beneficio.address, lotId(2))).to.equal(40_000n);
      expect(await token.balanceOf(productor.address, lotId(3))).to.equal(60_000n);
    });

    it("rechaza saltarse fases", async () => {
      const { controller, processor, grader, exporter, productor, cherry } = await loadFixture(harvestedFixture);
      await expect(
        controller.connect(processor).logDrying(cherry, productor.address, 1, 110, 0, H, CID),
      ).to.be.revertedWithCustomError(controller, "InvalidState").withArgs(cherry, State.HARVESTED);
      await expect(
        controller.connect(processor).logHulling(cherry, productor.address, 1, H, CID),
      ).to.be.revertedWithCustomError(controller, "InvalidState");
      await expect(controller.connect(grader).addCupping(cherry, 80, 0, H, CID)).to.be.revertedWithCustomError(
        controller,
        "InvalidState",
      );
      await expect(controller.connect(exporter).split(cherry, productor.address, [1], CID)).to.be.revertedWithCustomError(
        controller,
        "InvalidState",
      );
      await expect(controller.connect(exporter).markExported(cherry, H, H, CID)).to.be.revertedWithCustomError(
        controller,
        "InvalidState",
      );
      await controller.connect(processor).logProcessing(cherry, 0, 36, 45, H, CID);
      await expect(controller.connect(processor).logProcessing(cherry, 0, 36, 45, H, CID)).to.be.revertedWithCustomError(
        controller,
        "InvalidState",
      );
    });

    it("valida pH, humedad, puntaje y masa de salida", async () => {
      const { controller, processor, grader, productor, cherry } = await loadFixture(harvestedFixture);
      await expect(controller.connect(processor).logProcessing(cherry, 0, 36, 0, H, CID)).to.be.revertedWithCustomError(
        controller,
        "InvalidPh",
      );
      await expect(controller.connect(processor).logProcessing(cherry, 0, 36, 141, H, CID)).to.be.revertedWithCustomError(
        controller,
        "InvalidPh",
      );
      await controller.connect(processor).logProcessing(cherry, 0, 36, 45, H, CID);
      await expect(
        controller.connect(processor).logDrying(cherry, productor.address, 1, 0, 0, H, CID),
      ).to.be.revertedWithCustomError(controller, "InvalidMoisture");
      await expect(
        controller.connect(processor).logDrying(cherry, productor.address, 1, 1001, 0, H, CID),
      ).to.be.revertedWithCustomError(controller, "InvalidMoisture");
      await expect(
        controller.connect(processor).logDrying(cherry, productor.address, 0, 110, 0, H, CID),
      ).to.be.revertedWithCustomError(controller, "InvalidMass");
      await expect(
        controller.connect(processor).logDrying(cherry, productor.address, 500_001, 110, 0, H, CID),
      ).to.be.revertedWithCustomError(controller, "InvalidMass").withArgs(500_000, 500_001);
      await controller.connect(processor).logDrying(cherry, productor.address, 100_000, 110, 0, H, CID);
      await controller.connect(processor).logHulling(lotId(2), productor.address, 80_000, H, CID);
      await expect(controller.connect(grader).addCupping(lotId(3), 101, 0, H, CID)).to.be.revertedWithCustomError(
        controller,
        "InvalidScore",
      );
    });

    it("aplica los roles de cada fase", async () => {
      const { controller, outsider, productor, cherry } = await loadFixture(harvestedFixture);
      const denied = "AccessControlUnauthorizedAccount";
      const c = controller.connect(outsider);
      await expect(c.logProcessing(cherry, 0, 1, 45, H, CID)).to.be.revertedWithCustomError(controller, denied);
      await expect(c.logDrying(cherry, productor.address, 1, 110, 0, H, CID)).to.be.revertedWithCustomError(
        controller,
        denied,
      );
      await expect(c.logHulling(cherry, productor.address, 1, H, CID)).to.be.revertedWithCustomError(controller, denied);
      await expect(c.addCupping(cherry, 1, 0, H, CID)).to.be.revertedWithCustomError(controller, denied);
      await expect(c.split(cherry, productor.address, [1], CID)).to.be.revertedWithCustomError(controller, denied);
      await expect(c.merge([cherry, cherry], productor.address, CID)).to.be.revertedWithCustomError(controller, denied);
      await expect(c.markExported(cherry, H, H, CID)).to.be.revertedWithCustomError(controller, denied);
    });

    it("rechaza lotes inexistentes o ids que no son LOT", async () => {
      const { controller, processor } = await loadFixture(harvestedFixture);
      await expect(controller.getLot(lotId(99))).to.be.revertedWithCustomError(controller, "LotNotFound");
      await expect(controller.lineage(certId(1))).to.be.revertedWithCustomError(controller, "LotNotFound");
      await expect(controller.connect(processor).logProcessing(0n, 0, 1, 45, H, CID)).to.be.revertedWithCustomError(
        controller,
        "LotNotFound",
      );
    });
  });

  describe("custodia", () => {
    it("la firma el custodio actual o el relayer", async () => {
      const { controller, token, productor, beneficio, outsider, cherry } = await loadFixture(harvestedFixture);
      await expect(
        controller.connect(outsider).transferCustody(cherry, productor.address, outsider.address, 1, H, ""),
      ).to.be.revertedWithCustomError(controller, "NotCustodian");
      await controller.connect(productor).transferCustody(cherry, productor.address, beneficio.address, 1_000, H, "");
      expect(await token.balanceOf(beneficio.address, cherry)).to.equal(1_000n);
    });

    it("valida destino, masa y estado", async () => {
      const { controller, relayer, productor, beneficio, cherry } = await loadFixture(harvestedFixture);
      const c = controller.connect(relayer);
      await expect(c.transferCustody(cherry, productor.address, ethers.ZeroAddress, 1, H, "")).to.be.revertedWithCustomError(
        controller,
        "ZeroAddress",
      );
      await expect(c.transferCustody(cherry, productor.address, beneficio.address, 0, H, "")).to.be.revertedWithCustomError(
        controller,
        "InvalidMass",
      );
      await expect(
        c.transferCustody(cherry, productor.address, beneficio.address, 500_001, H, ""),
      ).to.be.revertedWithCustomError(controller, "InvalidMass");
    });

    it("no mueve lotes exportados", async () => {
      const f = await loadFixture(gradedFixture);
      await f.controller.connect(f.exporter).split(f.green, f.exportadora.address, [80_000], CID);
      await f.controller.connect(f.exporter).markExported(lotId(4), H, H, CID);
      await expect(
        f.controller.connect(f.relayer).transferCustody(lotId(4), f.exportadora.address, f.outsider.address, 1, H, ""),
      ).to.be.revertedWithCustomError(f.controller, "InvalidState");
    });
  });

  describe("split y merge", () => {
    it("split exige cantidades positivas dentro del saldo y admite re-ensacar", async () => {
      const { controller, exporter, exportadora, green } = await loadFixture(gradedFixture);
      const c = controller.connect(exporter);
      await expect(c.split(green, exportadora.address, [0, 1], CID)).to.be.revertedWithCustomError(controller, "InvalidMass");
      await expect(c.split(green, exportadora.address, [], CID)).to.be.revertedWithCustomError(controller, "InvalidMass");
      await expect(c.split(green, exportadora.address, [80_000, 1], CID))
        .to.be.revertedWithCustomError(controller, "InvalidMass")
        .withArgs(80_000, 80_001);
      await c.split(green, exportadora.address, [60_000], CID);
      // El saldo restante sigue en el lote verde.
      await c.split(green, exportadora.address, [20_000], CID);
      // Un saco PACKAGED se puede volver a dividir.
      await c.split(lotId(4), exportadora.address, [30_000, 30_000], CID);
      expect(await controller.lineage(lotId(7))).to.deep.equal([lotId(4)]);
    });

    it("merge exige dos lotes empaquetados con saldo del custodio", async () => {
      const { controller, exporter, exportadora, outsider, green } = await loadFixture(gradedFixture);
      const c = controller.connect(exporter);
      await expect(c.merge([green], exportadora.address, CID)).to.be.revertedWithCustomError(
        controller,
        "MergeNeedsTwoLots",
      );
      await expect(c.merge([green, green], exportadora.address, CID)).to.be.revertedWithCustomError(
        controller,
        "InvalidState",
      );
      await c.split(green, exportadora.address, [40_000, 40_000], CID);
      await expect(c.merge([lotId(4), lotId(5)], outsider.address, CID)).to.be.revertedWithCustomError(
        controller,
        "InvalidMass",
      );
      // Un id repetido se rechaza al quemar (no se puede contar dos veces el mismo saldo).
      await expect(c.merge([lotId(4), lotId(4)], exportadora.address, CID)).to.be.reverted;
    });

    it("merge de fincas distintas deja el origen en el linaje", async () => {
      const f = await loadFixture(gradedFixture);
      const finca2 = ethers.id("finca-uuid-2");
      await f.origin.connect(f.relayer).registerFinca(finca2, TENANT, GEO, 100, CID);
      await f.origin.connect(f.auditor).anchorAudit(finca2, ethers.id("a2"), true, 0);
      await f.origin.connect(f.auditor).issueDDS(finca2, f.productor.address, (await time.latest()) + YEAR, CID);
      // Segundo lote, de otra finca y otra variedad, directo hasta GRADED en custodia de la exportadora.
      const now = await time.latest();
      await f.controller
        .connect(f.farmer)
        .registerHarvest(finca2, f.exportadora.address, 100_000, ethers.encodeBytes32String("Bourbon"), 0, now - 999, CID);
      const other = lotId(4);
      await f.controller.connect(f.processor).logProcessing(other, 0, 1, 45, H, CID);
      await f.controller.connect(f.processor).logDrying(other, f.exportadora.address, 20_000, 110, 0, H, CID);
      await f.controller.connect(f.processor).logHulling(lotId(5), f.exportadora.address, 16_000, H, CID);
      await f.controller.connect(f.grader).addCupping(lotId(6), 84, 0, H, CID);

      const c = f.controller.connect(f.exporter);
      await c.split(f.green, f.exportadora.address, [80_000], CID); // lotId(7)
      await c.split(lotId(6), f.exportadora.address, [16_000], CID); // lotId(8)
      await c.merge([lotId(7), lotId(8)], f.exportadora.address, CID); // lotId(9)
      const merged = await f.controller.getLot(lotId(9));
      expect(merged.fincaId).to.equal(ethers.ZeroHash);
      expect(merged.ddsCertId).to.equal(0n);
      expect(merged.variety).to.equal(ethers.ZeroHash);
      expect(merged.harvestDate).to.equal((await f.controller.getLot(lotId(8))).harvestDate);
      expect(await f.token["totalSupply(uint256)"](lotId(9))).to.equal(96_000n);
    });

    it("propiedad: split y merge aleatorios conservan la masa", async () => {
      const { controller, token, exporter, exportadora, green } = await loadFixture(gradedFixture);
      const c = controller.connect(exporter);
      let seed = 42;
      const rand = (n: number) => {
        seed = (seed * 1103515245 + 12345) % 2 ** 31;
        return seed % n;
      };
      let current = green;
      for (let round = 0; round < 5; round++) {
        const pieces = 2 + rand(4);
        let remaining = 80_000;
        const amounts: number[] = [];
        for (let i = 0; i < pieces - 1; i++) {
          const a = 1 + rand(remaining - (pieces - 1 - i));
          amounts.push(a);
          remaining -= a;
        }
        amounts.push(remaining);
        const rc = await (await c.split(current, exportadora.address, amounts, CID)).wait();
        const childIds = rc!.logs
          .map((l) => controller.interface.parseLog(l))
          .find((l) => l?.name === "LotSplit")!.args.childIds as bigint[];
        let sum = 0n;
        for (const id of childIds) sum += await token.balanceOf(exportadora.address, id);
        expect(sum).to.equal(80_000n);
        await c.merge([...childIds], exportadora.address, CID);
        current = (1n << 248n) | (await token.lastSeq(1));
        expect(await token["totalSupply(uint256)"](current)).to.equal(80_000n);
      }
    });
  });

  describe("administración", () => {
    it("la pausa bloquea las escrituras", async () => {
      const { controller, admin, processor, cherry } = await loadFixture(harvestedFixture);
      await controller.connect(admin).pause();
      await expect(controller.connect(processor).logProcessing(cherry, 0, 1, 45, H, CID)).to.be.revertedWithCustomError(
        controller,
        "EnforcedPause",
      );
      await controller.connect(admin).unpause();
      await controller.connect(processor).logProcessing(cherry, 0, 1, 45, H, CID);
    });

    it("la pausa bloquea todas las operaciones de lotes", async () => {
      const f = await loadFixture(gradedFixture);
      await f.controller.connect(f.admin).pause();
      const c = f.controller;
      const paused = "EnforcedPause";
      await expect(
        c.connect(f.farmer).registerHarvest(FINCA, f.productor.address, 1, TYPICA, 0, 0, CID),
      ).to.be.revertedWithCustomError(c, paused);
      await expect(
        c.connect(f.processor).logDrying(f.cherry, f.beneficio.address, 1, 110, 0, H, CID),
      ).to.be.revertedWithCustomError(c, paused);
      await expect(
        c.connect(f.processor).logHulling(f.parchment, f.beneficio.address, 1, H, CID),
      ).to.be.revertedWithCustomError(c, paused);
      await expect(c.connect(f.grader).addCupping(f.green, 1, 0, H, CID)).to.be.revertedWithCustomError(c, paused);
      await expect(
        c.connect(f.relayer).transferCustody(f.green, f.exportadora.address, f.beneficio.address, 1, H, ""),
      ).to.be.revertedWithCustomError(c, paused);
      await expect(c.connect(f.exporter).split(f.green, f.exportadora.address, [1], CID)).to.be.revertedWithCustomError(
        c,
        paused,
      );
      await expect(
        c.connect(f.exporter).merge([f.green, f.green], f.exportadora.address, CID),
      ).to.be.revertedWithCustomError(c, paused);
      await expect(c.connect(f.exporter).markExported(f.green, H, H, CID)).to.be.revertedWithCustomError(c, paused);
    });

    it("rechaza inicializar con direcciones cero", async () => {
      const { token, origin, admin } = await loadFixture(deployFixture);
      const factory = await ethers.getContractFactory("TraceabilityController");
      await expect(
        upgrades.deployProxy(factory, [admin.address, ethers.ZeroAddress, await origin.getAddress()], { kind: "uups" }),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
      await expect(
        upgrades.deployProxy(factory, [admin.address, await token.getAddress(), ethers.ZeroAddress], { kind: "uups" }),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });
});
