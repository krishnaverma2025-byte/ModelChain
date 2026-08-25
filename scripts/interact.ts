import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    const [owner, buyer] = await ethers.getSigners();

    const contractAddress =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const modelChain = await ethers.getContractAt(
    "ModelChain",
    contractAddress
);

console.log("ModelChain:");
console.log(contractAddress);

    console.log("\nOwner:");
    console.log(owner.address);

    console.log("\nBuyer:");
    console.log(buyer.address);

    // -----------------------------
    // 1. Register AI Model
    // -----------------------------

    const price = ethers.parseEther("0.1");

    console.log("\nRegistering AI model...");

    const registerTx = await modelChain.registerModel(
    "Medical Diagnosis AI",
    "ipfs://bafkreieovfirlfgpzb543enbskagdpofryi3nlzsiiflywr6yrbl7adetq",
    "8ea9511594cfc87bcd91a1928061bdc58e11b6af32420abc5a3ec442bf80649c",
    price,
    10
);

    await registerTx.wait();

    console.log("Model registered!");

    // -----------------------------
    // 2. Read model
    // -----------------------------

    const model = await modelChain.getModel(1);

    console.log("\nModel information:");
    console.log("ID:", model.id.toString());
    console.log("Owner:", model.owner);
    console.log("Name:", model.name);
    console.log("CID:", model.cid);
    console.log("Hash:", model.modelHash);
    console.log(
        "Price:",
        ethers.formatEther(model.price),
        "ETH"
    );
    console.log(
        "Royalty:",
        model.royalty.toString() + "%"
    );
    console.log("Active:", model.active);

    // -----------------------------
    // 3. Verify model hash
    // -----------------------------

    const validHash = await modelChain.verifyModel(
        1,
        "8ea9511594cfc87bcd91a1928061bdc58e11b6af32420abc5a3ec442bf80649c"
    );

    console.log("\nHash verification:");
    console.log(validHash ? "VALID" : "INVALID");

    // -----------------------------
    // 4. Purchase license
    // -----------------------------

    console.log("\nBuyer purchasing license...");

    const purchaseTx = await modelChain
        .connect(buyer)
        .purchaseLicense(1, {
            value: price
        });

    await purchaseTx.wait();

    console.log("License purchased!");

    // -----------------------------
    // 5. Check license
    // -----------------------------

    const hasLicense = await modelChain.hasLicense(
        1,
        buyer.address
    );

    console.log("\nBuyer license status:");

    console.log(
        hasLicense
            ? "LICENSE VERIFIED"
            : "NO LICENSE"
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});