import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { CID, Kind, deployFixture, harvestedFixture, lotId } from "./fixtures";

describe("CoffeeToken", () => {
  it("codifica la clase en el byte alto del id", async () => {
    const { token } = await loadFixture(deployFixture);
    expect(await token.kindOf(lotId(7))).to.equal(Kind.LOT);
    expect(await token.kindOf((2n << 248n) | 1n)).to.equal(Kind.DDS_CERT);
    expect(await token.kindOf(5n)).to.equal(Kind.NONE);
    expect(await token.kindOf(9n << 248n)).to.equal(Kind.NONE);
  });

  it("solo CONTROLLER_ROLE acuña, quema, mueve o cambia URIs", async () => {
    const { token, outsider } = await loadFixture(deployFixture);
    const t = token.connect(outsider);
    const denied = "AccessControlUnauthorizedAccount";
    await expect(t.mintNew(Kind.LOT, outsider.address, 1, CID)).to.be.revertedWithCustomError(token, denied);
    await expect(t.mintNewBatch(Kind.LOT, outsider.address, [1], CID)).to.be.revertedWithCustomError(token, denied);
    await expect(t.burn(outsider.address, 1, 1)).to.be.revertedWithCustomError(token, denied);
    await expect(t.burnBatch(outsider.address, [1], [1])).to.be.revertedWithCustomError(token, denied);
    await expect(t.move(outsider.address, outsider.address, 1, 1)).to.be.revertedWithCustomError(token, denied);
    await expect(t.setTokenURI(1, CID)).to.be.revertedWithCustomError(token, denied);
  });

  it("no acuña la clase NONE", async () => {
    const { token, admin } = await loadFixture(deployFixture);
    await token.grantRole(await token.CONTROLLER_ROLE(), admin.address);
    await expect(token.mintNew(Kind.NONE, admin.address, 1, CID)).to.be.revertedWithCustomError(token, "InvalidKind");
  });

  it("bloquea transferencias directas entre cuentas (token y registro sincronizados)", async () => {
    const { token, productor, outsider, cherry } = await loadFixture(harvestedFixture);
    await expect(
      token.connect(productor).safeTransferFrom(productor.address, outsider.address, cherry, 1, "0x"),
    ).to.be.revertedWithCustomError(token, "TransferOnlyViaController");
    await token.connect(productor).setApprovalForAll(outsider.address, true);
    await expect(
      token.connect(outsider).safeBatchTransferFrom(productor.address, outsider.address, [cherry], [1], "0x"),
    ).to.be.revertedWithCustomError(token, "TransferOnlyViaController");
  });

  it("un DDS no se mueve ni por el controlador", async () => {
    const { token, admin, outsider } = await loadFixture(deployFixture);
    await token.grantRole(await token.CONTROLLER_ROLE(), admin.address);
    await token.mintNew(Kind.DDS_CERT, admin.address, 1, CID);
    await expect(token.move(admin.address, outsider.address, (2n << 248n) | 1n, 1)).to.be.revertedWithCustomError(
      token,
      "CertificateIsSoulbound",
    );
  });

  it("anuncia ERC-1155 y AccessControl", async () => {
    const { token } = await loadFixture(deployFixture);
    expect(await token.supportsInterface("0xd9b67a26")).to.equal(true); // ERC-1155
    expect(await token.supportsInterface("0x7965db0b")).to.equal(true); // AccessControl
  });
});

describe("Upgrades UUPS", () => {
  it("actualiza el controlador conservando el estado", async () => {
    const { controller, cherry } = await loadFixture(harvestedFixture);
    const before = await controller.getLot(cherry);
    const v2 = await upgrades.upgradeProxy(
      await controller.getAddress(),
      await ethers.getContractFactory("TraceabilityControllerV2Mock"),
      { kind: "uups" },
    );
    expect(await (v2 as unknown as { version(): Promise<string> }).version()).to.equal("v2");
    expect(await controller.getLot(cherry)).to.deep.equal(before);
  });

  it("solo el admin puede actualizar", async () => {
    const { controller, outsider } = await loadFixture(deployFixture);
    const impl = await upgrades.prepareUpgrade(
      await controller.getAddress(),
      await ethers.getContractFactory("TraceabilityControllerV2Mock"),
      { kind: "uups" },
    );
    await expect(controller.connect(outsider).upgradeToAndCall(impl as string, "0x")).to.be.revertedWithCustomError(
      controller,
      "AccessControlUnauthorizedAccount",
    );
  });

  it("las implementaciones no se pueden inicializar directamente", async () => {
    const { admin } = await loadFixture(deployFixture);
    const impl = await ethers.deployContract("CoffeeToken");
    await expect(impl.initialize(admin.address)).to.be.revertedWithCustomError(impl, "InvalidInitialization");
  });
});
