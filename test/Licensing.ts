import { expect } from "chai";
import { network } from "hardhat";

describe("License settlement", () => {
  it("credits 90 percent to creator and 10 percent to platform, never to an ordinary buyer", async () => {
    const { ethers } = await network.create();
    const [platform, creator, buyer] = await ethers.getSigners();
    const c = await ethers.deployContract("ModelChain");
    const price = ethers.parseEther("0.05");
    await c
      .connect(creator)
      .registerModel(
        "Revenue fixture",
        "encrypted-cid",
        ethers.sha256(ethers.toUtf8Bytes("fixture")),
        price,
        90,
      );
    await expect(c.connect(buyer).purchaseLicense(1, { value: price }))
      .to.emit(c, "RoyaltyPaid")
      .withArgs(1, creator.address, ethers.parseEther("0.045"));
    expect(await c.pendingWithdrawals(creator.address)).to.equal(
      ethers.parseEther("0.045"),
    );
    expect(await c.pendingWithdrawals(platform.address)).to.equal(
      ethers.parseEther("0.005"),
    );
    expect(await c.pendingWithdrawals(buyer.address)).to.equal(0n);
    await c.purchaseLicense(1, { value: price });
    expect(await c.pendingWithdrawals(platform.address)).to.equal(
      ethers.parseEther("0.01"),
    );
  });
  it("preserves credits on failed payout and prevents double withdrawal by reentry", async () => {
    const { ethers } = await network.create();
    const [, buyer] = await ethers.getSigners();
    const c = await ethers.deployContract("ModelChain");
    const recipient = await ethers.deployContract("RevenueRecipient", [
      await c.getAddress(),
    ]);
    await recipient.register();
    await recipient.configure(true, false);
    await c.connect(buyer).purchaseLicense(1, { value: 100n });
    await expect(recipient.withdraw()).to.be.revertedWith("Withdrawal failed");
    expect(await c.pendingWithdrawals(await recipient.getAddress())).to.equal(
      95n,
    );
    await recipient.configure(false, true);
    await recipient.withdraw();
    expect(await recipient.reentrySucceeded()).to.equal(false);
    expect(await c.pendingWithdrawals(await recipient.getAddress())).to.equal(
      0n,
    );
    expect(
      await ethers.provider.getBalance(await recipient.getAddress()),
    ).to.equal(95n);
    expect(await ethers.provider.getBalance(await c.getAddress())).to.equal(5n);
    await c.withdrawRevenue();
    expect(await ethers.provider.getBalance(await c.getAddress())).to.equal(0n);
  });
  it("enumerates, rejects invalid purchases, and allocates every wei", async () => {
    const { ethers } = await network.connect();
    const [platform, creator, buyer] = await ethers.getSigners();
    const c = await ethers.deployContract("ModelChain");
    await c
      .connect(creator)
      .registerModel(
        "Model",
        "encrypted-cid",
        ethers.sha256(ethers.toUtf8Bytes("model")),
        100n,
        95,
      );
    expect(await c.getModelCount()).to.equal(1n);
    await expect(c.getModel(0)).to.be.revertedWith("Model does not exist");
    await expect(
      c.connect(creator).purchaseLicense(1, { value: 100n }),
    ).to.be.revertedWith("Owner cannot buy");
    await expect(
      c.connect(buyer).purchaseLicense(1, { value: 99n }),
    ).to.be.revertedWith("Incorrect payment");
    await expect(c.connect(buyer).setModelActive(1, false)).to.be.revertedWith(
      "Only creator",
    );
    await c.connect(creator).setModelActive(1, false);
    await expect(
      c.connect(buyer).purchaseLicense(1, { value: 100n }),
    ).to.be.revertedWith("Model inactive");
    await c.connect(creator).setModelActive(1, true);
    await c.connect(buyer).purchaseLicense(1, { value: 100n });
    await expect(
      c.connect(buyer).purchaseLicense(1, { value: 100n }),
    ).to.be.revertedWith("Already licensed");
    expect(await c.pendingWithdrawals(creator.address)).to.equal(95n);
    expect(await c.pendingWithdrawals(platform.address)).to.equal(5n);
    await c.connect(creator).withdrawRevenue();
    await c.withdrawRevenue();
    expect(await ethers.provider.getBalance(await c.getAddress())).to.equal(0n);
  });
});
