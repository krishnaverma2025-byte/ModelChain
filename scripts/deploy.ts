import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    console.log("Deploying ModelChain...");

    const modelChain = await ethers.deployContract("ModelChain");

    await modelChain.waitForDeployment();

    const address = await modelChain.getAddress();

    console.log("ModelChain deployed to:");
    console.log(address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});