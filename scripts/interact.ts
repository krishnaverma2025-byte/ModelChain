// Read-only LOCAL development utility; never registers or purchases models.
import { network } from "hardhat";

async function main() {
    const address = process.env.CONTRACT_ADDRESS;
    const id = process.env.MODEL_ID;
    if (!address || !id || !/^[1-9]\d{0,18}$/.test(id)) {
        throw new Error("Set CONTRACT_ADDRESS and a positive MODEL_ID for an existing local registration");
    }
    const { ethers } = await network.create();
    if ((await ethers.provider.getNetwork()).chainId !== 31337n) {
        throw new Error("interact.ts is restricted to local Hardhat chain 31337");
    }
    if (!ethers.isAddress(address) || await ethers.provider.getCode(address) === "0x") {
        throw new Error("CONTRACT_ADDRESS must identify a deployed local contract");
    }
    const contract = await ethers.getContractAt("ModelChain", address);
    const model = await contract.getModel(BigInt(id));
    console.log("Model:", model.id.toString(), model.name);
    console.log("Creator:", model.owner);
    console.log("Encrypted storage identifier:", model.cid);
    console.log("Original SHA-256:", model.modelHash);
    console.log("Price:", ethers.formatEther(model.price), "ETH");
    console.log("Creator share:", model.royalty.toString() + "%");
    console.log("Active:", model.active);
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
