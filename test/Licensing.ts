import { expect } from "chai";
import { network } from "hardhat";

describe("License settlement", () => {
  it("enumerates, rejects invalid purchases, and allocates every wei", async () => {
    const { ethers } = await network.connect();
    const [platform, creator, buyer] = await ethers.getSigners();
    const c = await ethers.deployContract("ModelChain");
    await c.connect(creator).registerModel("Model", "encrypted-cid", ethers.sha256(ethers.toUtf8Bytes("model")), 100n, 95);
    expect(await c.getModelCount()).to.equal(1n);
    await expect(c.getModel(0)).to.be.revertedWith("Model does not exist");
    await expect(c.connect(creator).purchaseLicense(1, {value:100n})).to.be.revertedWith("Owner cannot buy");
    await expect(c.connect(buyer).purchaseLicense(1, {value:99n})).to.be.revertedWith("Incorrect payment");
    await expect(c.connect(buyer).setModelActive(1,false)).to.be.revertedWith("Only creator");
    await c.connect(creator).setModelActive(1,false);
    await expect(c.connect(buyer).purchaseLicense(1,{value:100n})).to.be.revertedWith("Model inactive");
    await c.connect(creator).setModelActive(1,true);
    await c.connect(buyer).purchaseLicense(1,{value:100n});
    await expect(c.connect(buyer).purchaseLicense(1,{value:100n})).to.be.revertedWith("Already licensed");
    expect(await c.pendingWithdrawals(creator.address)).to.equal(95n);
    expect(await c.pendingWithdrawals(platform.address)).to.equal(5n);
    await c.connect(creator).withdrawRevenue();
    await c.withdrawRevenue();
    expect(await ethers.provider.getBalance(await c.getAddress())).to.equal(0n);
  });
});
