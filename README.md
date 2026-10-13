# MontAI — verifiable AI model licensing

MontAI is an academic AI model marketplace that connects encrypted model delivery with Ethereum ownership, license payments and file integrity records. Creators publish a model and choose a price and revenue share; buyers purchase a wallet-bound license and receive a verified download.

## What it solves

Model sharing often separates payment, ownership records and the delivered file. MontAI links a model's creator address, encrypted storage identifier and original SHA-256 hash to an on-chain registry. The backend checks ownership or a purchased license before delivering the original bytes. This provides auditable registration and licensing evidence while keeping large files off-chain.

## Public demo

| Item | Current public test deployment |
| --- | --- |
| Website | https://montai-six.vercel.app |
| API base | https://montai-api.onrender.com |
| Health | https://montai-api.onrender.com/health |
| Network / chain ID | Ethereum Sepolia / `11155111` |
| ModelChain contract | `0x50Af9D424C10D596ddb5f5cF9A18Fc193a73e97e` |
| Deployment block | `11907790` |
| Deployment transaction | `0x0008dfc1e032112a0fa6f988a7b35f1b1e198210abd89e33334cc9c43ba85fd7` |

Open the [live website](https://montai-six.vercel.app) and check [backend health](https://montai-api.onrender.com/health). See the [contract on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x50Af9D424C10D596ddb5f5cF9A18Fc193a73e97e) and [deployment receipt](https://sepolia.etherscan.io/tx/0x0008dfc1e032112a0fa6f988a7b35f1b1e198210abd89e33334cc9c43ba85fd7). These are the recorded public deployment values; availability and provider configuration can change.

## Quick start for visitors

1. Install MetaMask from [metamask.io](https://metamask.io), create a wallet privately and select Sepolia.
2. Obtain free Sepolia ETH. Both creator and buyer need gas; the buyer also needs the model's price. Never use real funds for this demo.
3. Open the website. Browse Marketplace without purchasing. Render Free cold starts can delay the first access-service request.
4. **Creator:** choose Publish a Model, connect and sign the wallet challenge, select a supported file up to 25 MB, enter metadata, price and creator share, then confirm registration in MetaMask after encrypted upload.
5. **Buyer:** switch to a separate funded wallet, open the model, choose License Model, confirm price plus gas, wait for mining, then Download licensed model and sign the authentication challenge when prompted.
6. **Unlicensed tester:** switch to a third wallet and attempt the protected download. Authentication alone must not grant access; expect HTTP 403.

A wallet signature authenticates an address; a transaction changes blockchain state and costs gas. Read the [complete beginner guide](docs/USER_GUIDE.md) before the demo.

## Architecture at a glance

React/Vite on Vercel reads ModelChain through Alchemy and requests MetaMask signatures/transactions. Node/Express on Render encrypts uploads, checks on-chain download permissions, and decrypts authorized downloads. Solidity/Hardhat on Sepolia stores registration, pricing, licenses and revenue balances. Pinata/IPFS stores ciphertext; a private Supabase Storage bucket stores protected records containing wrapped file keys. Optional Supabase profiles are separate from wallet licensing.

## Documentation

| Read this | Purpose |
| --- | --- |
| [User guide](docs/USER_GUIDE.md) | Wallet setup, publishing, buying and downloading |
| [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md) | Components, API, sequences and trust boundaries |
| [Deployment guide](docs/DEPLOYMENT_GUIDE.md) | Fresh clone, environment tables and free-tier hosting |
| [Demo and testing](docs/DEMO_AND_TESTING_GUIDE.md) | Acceptance checklist and evidence |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Provider, wallet, startup and configuration issues |
| [Security notes](docs/SECURITY_NOTES.md) | Secrets, persistence, limitations and upgrades |
| [Public testnet runbook](PUBLIC_TESTNET_RUNBOOK.md) | Operational release gates and persistence checks |
| [Local runbook](LOCAL_RUNBOOK.md) | Isolated localhost development |

## Developer quick start

Prerequisites: Node 22, npm, Git; MetaMask and funded Sepolia accounts for public acceptance. Hosted deployment also needs Alchemy, Pinata, Supabase, Render and Vercel accounts.

```sh
git clone https://github.com/krishnaverma2025-byte/ModelChain.git
cd ModelChain
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run compile
npm test
npm test --prefix backend
npm test --prefix frontend
npm run build --prefix frontend
```

These commands install and verify the project; they do not configure or deploy it. Follow the deployment guide for Sepolia or the local runbook for a local chain. Code lives in `contracts/`, `scripts/`, `backend/src/` and `frontend/src/`.

## Security and scope

Sepolia ETH has **no real monetary value**. This is a public academic test, not an audited production service. On-chain verification demonstrates provenance/integrity metadata and byte equality, **not model quality, safety, accuracy or legal ownership**. Wallet addresses are pseudonymous. Encryption controls initial delivery; authorized recipients can copy plaintext. Never commit secrets or place them in `VITE_*` variables. Confirm project distribution licensing and model-specific usage terms before distribution.
