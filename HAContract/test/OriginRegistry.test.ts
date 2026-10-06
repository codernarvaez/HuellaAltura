import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { CID, FINCA, GEO, TENANT, YEAR, certId, compliantFixture, deployFixture } from "./fixtures";

describe("OriginRegistry", () => {
  describe("fincas", () => {
    it("registra la versión 1 y emite FincaRegistered", async () => {
      const { origin, relayer } = await loadFixture(deployFixture);
      await expect(origin.connect(relayer).registerFinca(FINCA, TENANT, GEO, 250, CID))
        .to.emit(origin, "FincaRegistered")
        .withArgs(FINCA, TENANT, GEO, 250, CID);
      const f = await origin.getFinca(FINCA);
      expect(f.version).to.equal(1);
      expect(f.areaHa100).to.equal(250);
      expect(await origin.geoHashAt(FINCA, 1)).to.equal(GEO);
    });

    it("valida duplicados, hash, área y rol", async () => {
      const { origin, relayer, outsider } = await loadFixture(deployFixture);
      await origin.connect(relayer).registerFinca(FINCA, TENANT, GEO, 250, CID);
      await expect(origin.connect(relayer).registerFinca(FINCA, TENANT, GEO, 250, CID)).to.be.revertedWithCustomError(
        origin,
        "FincaExists",
      );
      const other = ethers.id("otra");
      await expect(
        origin.connect(relayer).registerFinca(other, TENANT, ethers.ZeroHash, 250, CID),
      ).to.be.revertedWithCustomError(origin, "InvalidGeoHash");
      await expect(origin.connect(relayer).registerFinca(other, TENANT, GEO, 0, CID)).to.be.revertedWithCustomError(
        origin,
        "InvalidArea",
      );
      await expect(origin.connect(outsider).registerFinca(other, TENANT, GEO, 1, CID)).to.be.revertedWithCustomError(
        origin,
        "AccessControlUnauthorizedAccount",
      );
      await expect(origin.connect(relayer).updateFinca(other, GEO, 1, CID)).to.be.revertedWithCustomError(
        origin,
        "FincaNotFound",
      );
    });

    it("una nueva medición crea otra versión e invalida el DDS hasta re-auditar", async () => {
      const { origin, relayer, auditor, productor } = await loadFixture(compliantFixture);
      expect(await origin.isCompliant(FINCA)).to.equal(true);

      const geo2 = ethers.id("geojson-v2");
      await expect(origin.connect(relayer).updateFinca(FINCA, geo2, 300, CID))
        .to.emit(origin, "FincaUpdated")
        .withArgs(FINCA, 2, geo2, 300, CID);
      expect(await origin.geoHashAt(FINCA, 1)).to.equal(GEO);
      expect(await origin.geoHashAt(FINCA, 2)).to.equal(geo2);
      expect(await origin.isCompliant(FINCA)).to.equal(false);

      // La auditoría vieja era de la versión 1: no sirve para emitir sobre la versión 2.
      const expiry = (await time.latest()) + YEAR;
      await expect(
        origin.connect(auditor).issueDDS(FINCA, productor.address, expiry, CID),
      ).to.be.revertedWithCustomError(origin, "AuditNotApproved");
      await origin.connect(auditor).anchorAudit(FINCA, ethers.id("audit-v2"), true, 1609372800);
      await origin.connect(auditor).issueDDS(FINCA, productor.address, expiry, CID);
      expect(await origin.isCompliant(FINCA)).to.equal(true);
      expect((await origin.getCertificate(certId(2))).fincaVersion).to.equal(2);
    });
  });

  describe("auditorías y DDS", () => {
    it("ancla la auditoría con la versión de la finca", async () => {
      const { origin, relayer, auditor } = await loadFixture(deployFixture);
      await origin.connect(relayer).registerFinca(FINCA, TENANT, GEO, 250, CID);
      const h = ethers.id("audit");
      await expect(origin.connect(auditor).anchorAudit(FINCA, h, false, 1609372800))
        .to.emit(origin, "DeforestationAuditAnchored")
        .withArgs(FINCA, 1, h, false, 1609372800);
      const a = await origin.getLastAudit(FINCA);
      expect(a.approved).to.equal(false);
      expect(a.auditHash).to.equal(h);
    });

    it("no emite DDS sin auditoría aprobada ni con vencimiento pasado", async () => {
      const { origin, relayer, auditor, productor } = await loadFixture(deployFixture);
      await origin.connect(relayer).registerFinca(FINCA, TENANT, GEO, 250, CID);
      const expiry = (await time.latest()) + YEAR;
      await expect(
        origin.connect(auditor).issueDDS(FINCA, productor.address, expiry, CID),
      ).to.be.revertedWithCustomError(origin, "AuditNotApproved");
      await origin.connect(auditor).anchorAudit(FINCA, ethers.id("a"), false, 0);
      await expect(
        origin.connect(auditor).issueDDS(FINCA, productor.address, expiry, CID),
      ).to.be.revertedWithCustomError(origin, "AuditNotApproved");
      await origin.connect(auditor).anchorAudit(FINCA, ethers.id("a"), true, 0);
      await expect(
        origin.connect(auditor).issueDDS(FINCA, productor.address, await time.latest(), CID),
      ).to.be.revertedWithCustomError(origin, "InvalidExpiry");
      await expect(
        origin.connect(auditor).issueDDS(FINCA, ethers.ZeroAddress, expiry, CID),
      ).to.be.revertedWithCustomError(origin, "ZeroAddress");
    });

    it("acuña el DDS como token intransferible con su URI", async () => {
      const { origin, token, productor, outsider } = await loadFixture(compliantFixture);
      const id = certId(1);
      expect(await token.balanceOf(productor.address, id)).to.equal(1n);
      expect(await token.uri(id)).to.equal(`ipfs://${CID}`);
      expect(await token.kindOf(id)).to.equal(2);
      expect((await origin.getFinca(FINCA)).activeCertId).to.equal(id);
      await expect(
        token.connect(productor).safeTransferFrom(productor.address, outsider.address, id, 1, "0x"),
      ).to.be.revertedWithCustomError(token, "TransferOnlyViaController");
    });

    it("vence por fecha sin transacción", async () => {
      const { origin } = await loadFixture(compliantFixture);
      await time.increase(YEAR + 1);
      expect(await origin.isCompliant(FINCA)).to.equal(false);
    });

    it("revocar quema el token y deja la finca sin cumplimiento", async () => {
      const { origin, token, auditor, productor, outsider } = await loadFixture(compliantFixture);
      const id = certId(1);
      await expect(origin.connect(outsider).revokeDDS(id, "fraude")).to.be.revertedWithCustomError(
        origin,
        "AccessControlUnauthorizedAccount",
      );
      await expect(origin.connect(auditor).revokeDDS(id, "deforestación detectada"))
        .to.emit(origin, "DDSRevoked")
        .withArgs(id, FINCA, "deforestación detectada");
      expect(await token.balanceOf(productor.address, id)).to.equal(0n);
      expect(await origin.isCompliant(FINCA)).to.equal(false);
      expect((await origin.getCertificate(id)).revoked).to.equal(true);
      await expect(origin.connect(auditor).revokeDDS(id, "x")).to.be.revertedWithCustomError(
        origin,
        "CertificateAlreadyRevoked",
      );
      await expect(origin.connect(auditor).revokeDDS(certId(9), "x")).to.be.revertedWithCustomError(
        origin,
        "CertificateNotFound",
      );
    });

    it("una finca desconocida no cumple", async () => {
      const { origin } = await loadFixture(deployFixture);
      expect(await origin.isCompliant(ethers.id("nada"))).to.equal(false);
    });
  });

  describe("administración", () => {
    it("la pausa bloquea las escrituras", async () => {
      const { origin, admin, relayer, outsider } = await loadFixture(deployFixture);
      await expect(origin.connect(outsider).pause()).to.be.revertedWithCustomError(
        origin,
        "AccessControlUnauthorizedAccount",
      );
      await origin.connect(admin).pause();
      await expect(origin.connect(relayer).registerFinca(FINCA, TENANT, GEO, 1, CID)).to.be.revertedWithCustomError(
        origin,
        "EnforcedPause",
      );
      await origin.connect(admin).unpause();
      await origin.connect(relayer).registerFinca(FINCA, TENANT, GEO, 1, CID);
    });

    it("la pausa bloquea todas las operaciones del registro", async () => {
      const { origin, admin, relayer, auditor, productor, outsider } = await loadFixture(compliantFixture);
      await origin.connect(admin).pause();
      await expect(origin.connect(outsider).unpause()).to.be.revertedWithCustomError(
        origin,
        "AccessControlUnauthorizedAccount",
      );
      const paused = "EnforcedPause";
      await expect(origin.connect(relayer).updateFinca(FINCA, GEO, 1, CID)).to.be.revertedWithCustomError(origin, paused);
      await expect(origin.connect(auditor).anchorAudit(FINCA, GEO, true, 0)).to.be.revertedWithCustomError(origin, paused);
      await expect(
        origin.connect(auditor).issueDDS(FINCA, productor.address, (await time.latest()) + YEAR, CID),
      ).to.be.revertedWithCustomError(origin, paused);
      await expect(origin.connect(auditor).revokeDDS(certId(1), "x")).to.be.revertedWithCustomError(origin, paused);
    });

    it("cada operación exige su rol y una finca existente", async () => {
      const { origin, relayer, auditor, outsider, productor } = await loadFixture(compliantFixture);
      const denied = "AccessControlUnauthorizedAccount";
      await expect(origin.connect(outsider).updateFinca(FINCA, GEO, 1, CID)).to.be.revertedWithCustomError(origin, denied);
      await expect(origin.connect(relayer).anchorAudit(FINCA, GEO, true, 0)).to.be.revertedWithCustomError(origin, denied);
      await expect(
        origin.connect(relayer).issueDDS(FINCA, productor.address, (await time.latest()) + YEAR, CID),
      ).to.be.revertedWithCustomError(origin, denied);
      await expect(origin.connect(auditor).anchorAudit(ethers.id("x"), GEO, true, 0)).to.be.revertedWithCustomError(
        origin,
        "FincaNotFound",
      );
      await expect(
        origin.connect(auditor).issueDDS(ethers.id("x"), productor.address, (await time.latest()) + YEAR, CID),
      ).to.be.revertedWithCustomError(origin, "FincaNotFound");
    });

    it("no se puede inicializar dos veces ni con token cero", async () => {
      const { origin, token, admin } = await loadFixture(deployFixture);
      await expect(origin.initialize(admin.address, await token.getAddress())).to.be.revertedWithCustomError(
        origin,
        "InvalidInitialization",
      );
      const factory = await ethers.getContractFactory("OriginRegistry");
      await expect(
        upgrades.deployProxy(factory, [admin.address, ethers.ZeroAddress], { kind: "uups" }),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
      await expect(
        upgrades.deployProxy(factory, [ethers.ZeroAddress, await token.getAddress()], { kind: "uups" }),
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });
});
