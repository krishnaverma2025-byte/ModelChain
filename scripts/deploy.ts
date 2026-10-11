import { network } from "hardhat";
import { HDNodeWallet } from "ethers";

async function main() {
    const { ethers } = await network.create();
    const chainId=(await ethers.provider.getNetwork()).chainId;
    const [deployer]=await ethers.getSigners();
    const account=await deployer.getAddress();
    if(chainId!==31337n){
        if(chainId!==11155111n) throw new Error("Only localhost or Sepolia is supported by this deployment script");
        // Public Hardhat fixture mnemonic: reject every default development account.
        for(let i=0;i<20;i++){
            const development=HDNodeWallet.fromPhrase("test test test test test test test test test test test junk",undefined,`m/44'/60'/0'/0/${i}`);
            if(account.toLowerCase()===development.address.toLowerCase()) throw new Error("Never deploy with a Hardhat development account on a public network");
        }
        if(process.env.MONTAI_DEPLOY_DRY_RUN!=="1" && process.env.MONTAI_ALLOW_TESTNET_DEPLOYMENT!=="sepolia") throw new Error("Public deployment requires explicit approval and MONTAI_ALLOW_TESTNET_DEPLOYMENT=sepolia");
    }
    console.log(`Network: ${chainId}; platform/deployer: ${account}`);
    if(process.env.MONTAI_DEPLOY_DRY_RUN==="1"){
        console.log("Preflight only: balance",ethers.formatEther(await ethers.provider.getBalance(account)),"ETH. No transaction submitted.");
        return;
    }

    console.log("Deploying ModelChain...");

    const modelChain = await ethers.deployContract("ModelChain");

    await modelChain.waitForDeployment();

    const address = await modelChain.getAddress();
    const receipt = await modelChain.deploymentTransaction()?.wait();

    console.log("ModelChain deployed to:");
    console.log(address);
    console.log(`Deployment transaction: ${receipt?.hash}; block: ${receipt?.blockNumber}`);
}

main().catch(() => {
    console.error("Deployment failed. Check network, private configuration, dedicated deployer balance and explicit testnet approval. RPC/key error details are suppressed.");
    process.exitCode = 1;
});
