import { expect } from "chai";
import { network } from "hardhat";

describe("ModelChain", function () {
  it("Should register a model", async function () {
    const { ethers } = await network.connect();
    const [owner] = await ethers.getSigners();
    const modelChain = await ethers.deployContract("ModelChain");

    await modelChain.registerModel(
      "Test AI Model",
      "ipfs://test-cid",
      "hash123",
      ethers.parseEther("0.1"),
      10
    );

    const model = await modelChain.getModel(1);

    expect(model.id).to.equal(1n);
    expect(model.owner).to.equal(owner.address);
    expect(model.name).to.equal("Test AI Model");
    expect(model.cid).to.equal("ipfs://test-cid");
    expect(model.modelHash).to.equal("hash123");
    expect(model.price).to.equal(ethers.parseEther("0.1"));
    expect(model.royalty).to.equal(10n);
    expect(model.active).to.equal(true);
  });

  it("Should verify a model hash", async function () {
    const { ethers } = await network.connect();
    const modelChain = await ethers.deployContract("ModelChain");

    await modelChain.registerModel(
      "Test AI Model",
      "ipfs://test-cid",
      "hash123",
      ethers.parseEther("0.1"),
      10
    );

    expect(await modelChain.verifyModel(1, "hash123")).to.equal(true);
    expect(await modelChain.verifyModel(1, "wrong-hash")).to.equal(false);
  });

  it("Should allow another user to purchase a license", async function () {
    const { ethers } = await network.connect();
    const [owner, buyer] = await ethers.getSigners();
    const modelChain = await ethers.deployContract("ModelChain");
    const price = ethers.parseEther("0.1");

    await modelChain.registerModel(
      "Test AI Model",
      "ipfs://test-cid",
      "hash123",
      price,
      10
    );

    await modelChain.connect(buyer).purchaseLicense(1, {
      value: price
    });

    expect(
      await modelChain.hasLicense(1, buyer.address)
    ).to.equal(true);
  });
});
